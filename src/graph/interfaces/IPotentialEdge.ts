import {IAPINavImIm} from "../../API";

/**
 * Interface that describes the properties for a node that is the destination of a
 * potential edge from an origin node.
 *
 * @interface IPotentialEdge
 */
export interface IPotentialEdge {
    /**
     * Distance to the origin node.
     * @property {number} distance
     */
    distance: number;

    /**
     * Change in motion with respect to the viewing direction
     * of the origin node.
     * @property {number} motionChange
     */
    motionChange: number;

    /**
     * The angle between motion vector and the XY-plane
     * @property {number} verticalMotion
     */
    verticalMotion: number;

    /**
     * Change in viewing direction with respect to the origin node.
     * @property {number} directionChange
     */
    directionChange: number;

    /**
     * Change in viewing direction with respect to the XY-plane.
     * @property {number} verticalDirectionChange
     */
    verticalDirectionChange: number;

    /**
     * General camera rotation with respect to the origin node.
     * @property {number} rotation
     */
    rotation: number;

    /**
     * Determines if the origin and destination node are in the
     * same sequence.
     * @property {boolean} sameSequence
     */
    sameSequence: boolean;

    /**
     * Determines if the origin and destination node are considered
     * to be in the same merge connected component.
     * @property {boolean} sameMergeCc
     */
    sameMergeCc: boolean;

    /**
     * APINavImIm properties of destination node.
     * @property {IAPINavImIm} apiNavImIm
     */
    apiNavImIm: IAPINavImIm;
}

export default IPotentialEdge;
