/// <reference path="../../../typings/index.d.ts" />

import * as vd from "virtual-dom";

import {Observable} from "rxjs/Observable";
import {Scheduler} from "rxjs/Scheduler";
import {Subject} from "rxjs/Subject";
import {Subscription} from "rxjs/Subscription";

import "rxjs/add/observable/combineLatest";
import "rxjs/add/observable/of";
import "rxjs/add/observable/concat";

import "rxjs/add/operator/auditTime";
import "rxjs/add/operator/bufferCount";
import "rxjs/add/operator/concat";
import "rxjs/add/operator/distinctUntilChanged";
import "rxjs/add/operator/filter";
import "rxjs/add/operator/finally";
import "rxjs/add/operator/first";
import "rxjs/add/operator/map";
import "rxjs/add/operator/publishReplay";
import "rxjs/add/operator/retry";
import "rxjs/add/operator/scan";
import "rxjs/add/operator/share";
import "rxjs/add/operator/switchMap";
import "rxjs/add/operator/takeUntil";
import "rxjs/add/operator/withLatestFrom";

import {
    Component,
    ComponentService,
    ISequenceConfiguration,
    SequenceDOMRenderer,
} from "../../Component";
import {EdgeDirection} from "../../Edge";
import {
    IEdgeStatus,
    GraphMode,
    Node,
    Sequence,
} from "../../Graph";
import {IVNodeHash} from "../../Render";
import {IFrame} from "../../State";
import {
    Container,
    Navigator,
} from "../../Viewer";

interface IConfigurationOperation {
    (configuration: ISequenceConfiguration): ISequenceConfiguration;
}

/**
 * @class SequenceComponent
 * @classdesc Component showing navigation arrows for sequence directions
 * as well as playing button. Exposes an API to start and stop play.
 */
export class SequenceComponent extends Component<ISequenceConfiguration> {
    /** @inheritdoc */
    public static componentName: string = "sequence";

    /**
     * Event fired when playing starts or stops.
     *
     * @event PlayerComponent#playingchanged
     * @type {boolean} Indicates whether the player is playing.
     */
    public static playingchanged: string = "playingchanged";

    private _sequenceDOMRenderer: SequenceDOMRenderer;
    private _scheduler: Scheduler;

    private _hoveredKeySubject$: Subject<string>;
    private _hoveredKey$: Observable<string>;
    private _containerWidth$: Subject<number>;

    private _renderSubscription: Subscription;
    private _playingSubscription: Subscription;
    private _containerWidthSubscription: Subscription;
    private _hoveredKeySubscription: Subscription;
    private _setSpeedSubscription: Subscription;
    private _setDirectionSubscription: Subscription;
    private _setSequenceGraphModeSubscription: Subscription;
    private _setSpatialGraphModeSubscription: Subscription;
    private _sequenceSubscription: Subscription;
    private _moveSubscription: Subscription;
    private _cacheSequenceNodesSubscription: Subscription;
    private _stopSubscription: Subscription;

    constructor(
        name: string,
        container: Container,
        navigator: Navigator,
        renderer?: SequenceDOMRenderer,
        scheduler?: Scheduler) {

        super(name, container, navigator);

        this._sequenceDOMRenderer = !!renderer ? renderer : new SequenceDOMRenderer(container);
        this._scheduler = scheduler;

        this._containerWidth$ = new Subject<number>();
        this._hoveredKeySubject$ = new Subject<string>();

        this._hoveredKey$ = this._hoveredKeySubject$.share();

        this._navigator.playService.playing$
            .skip(1)
            .withLatestFrom(this._configuration$)
            .subscribe(
                ([playing, configuration]: [boolean, ISequenceConfiguration]): void => {
                    this.fire(SequenceComponent.playingchanged, playing);

                    if (playing === configuration.playing) {
                        return;
                    }

                    if (playing) {
                        this.play();
                    } else {
                        this.stop();
                    }
                });

        this._navigator.playService.direction$
            .skip(1)
            .withLatestFrom(this._configuration$)
            .subscribe(
                ([direction, configuration]: [EdgeDirection, ISequenceConfiguration]): void => {
                    if (direction !== configuration.direction) {
                        this.setDirection(direction);
                    }
                });
    }

    /**
     * Get hovered key observable.
     *
     * @description An observable emitting the key of the node for the direction
     * arrow that is being hovered. When the mouse leaves a direction arrow null
     * is emitted.
     *
     * @returns {Observable<string>}
     */
    public get hoveredKey$(): Observable<string> {
        return this._hoveredKey$;
    }

    /**
     * Start playing.
     *
     * @fires PlayerComponent#playingchanged
     */
    public play(): void {
        this.configure({ playing: true });
    }

    /**
     * Stop playing.
     *
     * @fires PlayerComponent#playingchanged
     */
    public stop(): void {
        this.configure({ playing: false });
    }

    /**
     * Set the direction to follow when playing.
     *
     * @param {EdgeDirection} direction - The direction that will be followed when playing.
     */
    public setDirection(direction: EdgeDirection): void {
        this.configure({ direction: direction });
    }

    /**
     * Set highlight key.
     *
     * @description The arrow pointing towards the node corresponding to the
     * highlight key will be highlighted.
     *
     * @param {string} highlightKey Key of node to be highlighted if existing.
     */
    public setHighlightKey(highlightKey: string): void {
        this.configure({ highlightKey: highlightKey });
    }

    /**
     * Set max width of container element.
     *
     * @description Set max width of the container element holding
     * the sequence navigation elements. If the min width is larger than the
     * max width the min width value will be used.
     *
     * The container element is automatically resized when the resize
     * method on the Viewer class is called.
     *
     * @param {number} minWidth
     */
    public setMaxWidth(maxWidth: number): void {
        this.configure({ maxWidth: maxWidth });
    }

    /**
     * Set min width of container element.
     *
     * @description Set min width of the container element holding
     * the sequence navigation elements. If the min width is larger than the
     * max width the min width value will be used.
     *
     * The container element is automatically resized when the resize
     * method on the Viewer class is called.
     *
     * @param {number} minWidth
     */
    public setMinWidth(minWidth: number): void {
        this.configure({ minWidth: minWidth });
    }

    /**
     * Set the value indicating whether the sequence UI elements should be visible.
     *
     * @param {boolean} visible
     */
    public setVisible(visible: boolean): void {
        this.configure({ visible: visible });
    }

    /** @inheritdoc */
    public resize(): void {
        this._configuration$
            .first()
            .map(
                (configuration: ISequenceConfiguration): number => {
                    return this._sequenceDOMRenderer.getContainerWidth(
                        this._container.element,
                        configuration);
                })
            .subscribe(
                (containerWidth: number): void => {
                    this._containerWidth$.next(containerWidth);
                });
    }

    protected _activate(): void {
        this._sequenceDOMRenderer.activate();

        const edgeStatus$: Observable<IEdgeStatus> = this._navigator.stateService.currentNode$
            .switchMap(
                (node: Node): Observable<IEdgeStatus> => {
                    return node.sequenceEdges$;
                })
            .publishReplay(1)
            .refCount();

        const sequence$: Observable<Sequence> = this._navigator.stateService.currentNode$
            .distinctUntilChanged(
                undefined,
                (node: Node): string => {
                    return node.sequenceKey;
                })
            .switchMap(
                (node: Node): Observable<Sequence> => {
                    return Observable
                        .concat(
                            Observable.of(null),
                            this._navigator.graphService.cacheSequence$(node.sequenceKey)
                                .retry(3)
                                .catch(
                                    (e: Error): Observable<Sequence> => {
                                        console.error("Failed to cache sequence", e);

                                        return Observable.of(null);
                                    }));
                })
            .startWith(null)
            .publishReplay(1)
            .refCount();

        this._sequenceSubscription = sequence$.subscribe();

        const rendererKey$: Observable<string> = this._sequenceDOMRenderer.index$
            .withLatestFrom(sequence$)
            .map(
                ([index, sequence]: [number, Sequence]): string => {
                    return sequence != null ? sequence.keys[index] : null;
                })
            .filter(
                (key: string): boolean => {
                    return !!key;
                })
            .distinctUntilChanged()
            .publish()
            .refCount();

        this._moveSubscription = Observable
            .merge(
                rendererKey$.debounceTime(100, this._scheduler),
                rendererKey$.auditTime(400, this._scheduler))
            .distinctUntilChanged()
            .switchMap(
                (key: string): Observable<Node> => {
                    return this._navigator.moveToKey$(key)
                        .catch(
                            (e: Error): Observable<Node> => {
                                return Observable.empty();
                            });
                })
            .subscribe();

        this._setSequenceGraphModeSubscription = this._sequenceDOMRenderer.changingPositionChanged$
            .filter(
                (changing: boolean): boolean => {
                    return changing;
                })
            .subscribe(
                (): void => {
                    this._navigator.graphService.setGraphMode(GraphMode.Sequence);
                });

        this._setSpatialGraphModeSubscription = this._sequenceDOMRenderer.changingPositionChanged$
            .filter(
                (changing: boolean): boolean => {
                    return !changing;
                })
            .subscribe(
                (): void => {
                    this._navigator.graphService.setGraphMode(GraphMode.Spatial);
                });

        this._navigator.graphService.graphMode$
            .switchMap(
                (mode: GraphMode): Observable<Node> => {
                    return mode === GraphMode.Spatial ?
                        this._navigator.stateService.currentNode$
                            .take(2) :
                        Observable.empty();
                })
            .filter(
                (node: Node): boolean => {
                    return !node.spatialEdges.cached;
                })
            .switchMap(
                (node: Node): Observable<Node> => {
                    return this._navigator.graphService.cacheNode$(node.key)
                        .catch(
                            (e: Error): Observable<Node> => {
                                return Observable.empty();
                            });
                })
            .subscribe();

        this._stopSubscription = this._sequenceDOMRenderer.changingPositionChanged$
            .filter(
                (changing: boolean): boolean => {
                    return changing;
                })
            .subscribe(
                (): void => {
                    this._navigator.playService.stop();
                });

        this._cacheSequenceNodesSubscription = Observable
            .combineLatest(
                this._navigator.graphService.graphMode$,
                this._sequenceDOMRenderer.changingPositionChanged$
                    .startWith(false)
                    .distinctUntilChanged())
            .withLatestFrom(this._navigator.stateService.currentNode$)
            .switchMap(
                ([[mode, changing], node]: [[GraphMode, boolean], Node]): Observable<Sequence> => {
                    return changing && mode === GraphMode.Sequence ?
                        this._navigator.graphService.cacheSequenceNodes$(node.sequenceKey, node.key)
                            .retry(3)
                            .catch(
                                (error: Error): Observable<Sequence> => {
                                    console.error("Failed to cache sequence nodes.", error);

                                    return Observable.empty();
                                }) :
                        Observable.empty();
                })
            .subscribe();

        const position$: Observable<{ index: number, max: number }> = sequence$
            .switchMap(
                (sequence: Sequence): Observable<{ index: number, max: number }> => {
                    if (!sequence) {
                        return Observable.of({ index: null, max: null });
                    }

                    let firstCurrentKey: boolean = true;

                    return this._sequenceDOMRenderer.changingPositionChanged$
                        .startWith(false)
                        .distinctUntilChanged()
                        .switchMap(
                            (changingPosition: boolean): Observable<string> => {
                                const skip: number = !changingPosition && firstCurrentKey ? 0 : 1;
                                firstCurrentKey = false;

                                return changingPosition ?
                                    rendererKey$ :
                                    this._navigator.stateService.currentNode$
                                        .map(
                                            (node: Node): string => {
                                                return node.key;
                                            })
                                        .distinctUntilChanged()
                                        .skip(skip);
                            })
                        .map(
                            (key: string): { index: number, max: number } => {
                                const index: number = sequence.keys.indexOf(key);

                                if (index === -1) {
                                    return { index: null, max: null };
                                }

                                return { index: index, max: sequence.keys.length - 1 };
                            });
                });

        this._renderSubscription = Observable
            .combineLatest(
                edgeStatus$,
                this._configuration$,
                this._containerWidth$,
                this._sequenceDOMRenderer.changed$.startWith(this._sequenceDOMRenderer),
                this._navigator.playService.speed$,
                position$)
            .map(
                (
                    [edgeStatus, configuration, containerWidth, renderer, speed, position]:
                    [
                        IEdgeStatus,
                        ISequenceConfiguration,
                        number,
                        SequenceDOMRenderer,
                        number,
                        { index: number, max: number }
                    ]): IVNodeHash => {

                    const vNode: vd.VNode = this._sequenceDOMRenderer
                        .render(
                            edgeStatus,
                            configuration,
                            containerWidth,
                            speed,
                            position.index,
                            position.max,
                            this,
                            this._navigator);

                    return {name: this._name, vnode: vNode };
                })
            .subscribe(this._container.domRenderer.render$);

        this._setSpeedSubscription = this._sequenceDOMRenderer.speed$
            .subscribe(
                (speed: number): void => {
                    this._navigator.playService.setSpeed(speed);
                });

        this._setDirectionSubscription = this._configuration$
            .map(
                (configuration: ISequenceConfiguration): EdgeDirection => {
                    return configuration.direction;
                })
            .distinctUntilChanged()
            .subscribe(
                (direction: EdgeDirection): void => {
                    this._navigator.playService.setDirection(direction);
                });

        this._containerWidthSubscription = this._configuration$
            .distinctUntilChanged(
                (value1: [number, number], value2: [number, number]): boolean => {
                    return value1[0] === value2[0] && value1[1] === value2[1];
                },
                (configuration: ISequenceConfiguration) => {
                    return [configuration.minWidth, configuration.maxWidth];
                })
            .map(
                (configuration: ISequenceConfiguration): number => {
                    return this._sequenceDOMRenderer.getContainerWidth(
                        this._container.element,
                        configuration);
                })
            .subscribe(this._containerWidth$);

        this._playingSubscription = this._configuration$
            .map(
                (configuration: ISequenceConfiguration): boolean => {
                    return configuration.playing;
                })
            .distinctUntilChanged()
            .subscribe(
                (playing: boolean) => {
                    if (playing) {
                        this._navigator.playService.play();
                    } else {
                        this._navigator.playService.stop();
                    }
                });

        this._hoveredKeySubscription = this._sequenceDOMRenderer.mouseEnterDirection$
            .switchMap(
                (direction: EdgeDirection): Observable<string> => {
                    return edgeStatus$
                        .map(
                            (edgeStatus: IEdgeStatus): string => {
                                for (let edge of edgeStatus.edges) {
                                    if (edge.data.direction === direction) {
                                        return edge.to;
                                    }
                                }

                                return null;
                            })
                        .takeUntil(this._sequenceDOMRenderer.mouseLeaveDirection$)
                        .concat<string>(Observable.of<string>(null));
                })
            .distinctUntilChanged()
            .subscribe(this._hoveredKeySubject$);
    }

    protected _deactivate(): void {
        this._renderSubscription.unsubscribe();
        this._playingSubscription.unsubscribe();
        this._containerWidthSubscription.unsubscribe();
        this._hoveredKeySubscription.unsubscribe();
        this._setSpeedSubscription.unsubscribe();
        this._setDirectionSubscription.unsubscribe();
        this._setSequenceGraphModeSubscription.unsubscribe();
        this._setSpatialGraphModeSubscription.unsubscribe();
        this._sequenceSubscription.unsubscribe();
        this._moveSubscription.unsubscribe();
        this._cacheSequenceNodesSubscription.unsubscribe();
        this._stopSubscription.unsubscribe();

        this._sequenceDOMRenderer.deactivate();
    }

    protected _getDefaultConfiguration(): ISequenceConfiguration {
        return {
            direction: EdgeDirection.Next,
            maxWidth: 108,
            minWidth: 70,
            playing: false,
            visible: true,
        };
    }
}

ComponentService.register(SequenceComponent);
export default SequenceComponent;
