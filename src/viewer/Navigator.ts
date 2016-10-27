/// <reference path="../../typings/index.d.ts" />

import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {Observable} from "rxjs/Observable";
import {Subject} from "rxjs/Subject";

import "rxjs/add/observable/fromPromise";
import "rxjs/add/observable/of";
import "rxjs/add/observable/throw";

import "rxjs/add/operator/first";
import "rxjs/add/operator/map";
import "rxjs/add/operator/mergeMap";

import {
    APIv3,
    IFullNode,
    ILatLon,
} from "../API";
import {
    Graph,
    GraphService,
    IEdgeStatus,
    ImageLoadingService,
    Node,
} from "../Graph";
import {EdgeDirection} from "../Edge";
import {StateService} from "../State";
import {LoadingService} from "../Viewer";

export class Navigator {
    private _apiV3: APIv3;

    private _graphService: GraphService;
    private _imageLoadingService: ImageLoadingService;
    private _loadingService: LoadingService;
    private _stateService: StateService;

    private _keyRequested$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    private _movedToKey$: Subject<string> = new Subject<string>();
    private _dirRequested$: BehaviorSubject<EdgeDirection> = new BehaviorSubject<EdgeDirection>(null);
    private _latLonRequested$: BehaviorSubject<ILatLon> = new BehaviorSubject<ILatLon>(null);

    constructor (
        clientId: string,
        graphService?: GraphService,
        imageLoadingService?: ImageLoadingService,
        loadingService?: LoadingService,
        stateService?: StateService) {

        this._apiV3 = new APIv3(clientId);

        this._imageLoadingService = imageLoadingService != null ? imageLoadingService : new ImageLoadingService();

        this._graphService = graphService != null ?
            graphService :
            new GraphService(new Graph(this.apiV3), this._imageLoadingService);

        this._loadingService = loadingService != null ? loadingService : new LoadingService();
        this._stateService = stateService != null ? stateService : new StateService();
    }

    public get apiV3(): APIv3 {
        return this._apiV3;
    }

    public get graphService(): GraphService {
        return this._graphService;
    }

    public get imageLoadingService(): ImageLoadingService {
        return this._imageLoadingService;
    }

    public get keyRequested$(): Observable<string> {
        return this._keyRequested$;
    }

    public get loadingService(): LoadingService {
        return this._loadingService;
    }

    public get movedToKey$(): Observable<string> {
        return this._movedToKey$;
    }

    public get stateService(): StateService {
        return this._stateService;
    }

    public moveToKey$(key: string): Observable<Node> {
        this.loadingService.startLoading("navigator");
        this._keyRequested$.next(key);

        return this._graphService.cacheNode$(key)
            .do(
                (node: Node) => {
                    this.stateService.setNodes([node]);
                    this._movedToKey$.next(node.key);
                })
            .finally(
                (): void => {
                    this.loadingService.stopLoading("navigator");
                });
    }

    public moveDir$(dir: EdgeDirection): Observable<Node> {
        this.loadingService.startLoading("navigator");
        this._dirRequested$.next(dir);

        return this.stateService.currentNode$
            .first()
            .mergeMap<string>(
                (node: Node): Observable<string> => {
                    return ([EdgeDirection.Next, EdgeDirection.Prev].indexOf(dir) > -1 ?
                        node.sequenceEdges$ :
                        node.spatialEdges$)
                            .first()
                            .map<string>(
                                (status: IEdgeStatus): string => {
                                    for (let edge of status.edges) {
                                        if (edge.data.direction === dir) {
                                            return edge.to;
                                        }
                                    }

                                    return null;
                                });
                })
            .mergeMap<Node>(
                (directionKey: string) => {
                    if (directionKey == null) {
                        this.loadingService.stopLoading("navigator");

                        return Observable
                            .throw<Node>(
                                new Error(`Direction (${dir}) does not exist (or is not cached yet) for current node.`));
                    }

                    return this.moveToKey$(directionKey);
                });
    }

    public moveCloseTo$(lat: number, lon: number): Observable<Node> {
        this.loadingService.startLoading("navigator");
        this._latLonRequested$.next({lat: lat, lon: lon});

        return this.apiV3.imageCloseTo$(lat, lon)
            .mergeMap<Node>(
                (fullNode: IFullNode): Observable<Node> => {
                    if (fullNode == null) {
                        this.loadingService.stopLoading("navigator");

                        return Observable
                            .throw<Node>(
                                new Error(`No image found close to lat ${lat}, lon ${lon}.`));
                    }

                    return this.moveToKey$(fullNode.key);
                });
    }
}

export default Navigator;
