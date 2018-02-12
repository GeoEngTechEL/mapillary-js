/// <reference path="../../../typings/index.d.ts" />

import {NodeHelper} from "../../helper/NodeHelper.spec";

import {
    DirectionDOMRenderer,
    IDirectionConfiguration,
} from "../../../src/Component";
import {Node} from "../../../src/Graph";
import {
    RenderCamera,
    RenderMode,
} from "../../../src/Render";
import {Navigator} from "../../../src/Viewer";

describe("DirectionDOMRenderer.ctor", () => {
    it("should be defined", () => {
        let configuration: IDirectionConfiguration = {
            distinguishSequence: false,
            maxWidth: 200,
            minWidth: 100,
        };

        let element: HTMLElement = document.createElement("div");
        let renderer: DirectionDOMRenderer = new DirectionDOMRenderer(configuration, element);

        expect(renderer).toBeDefined();
    });
});

describe("DirectionDOMRenderer.needsRender", () => {
    let helper: NodeHelper;

    beforeEach(() => {
        helper = new NodeHelper();
    });

    it("should not need render when constructed", () => {
        let configuration: IDirectionConfiguration = {
            distinguishSequence: false,
            maxWidth: 200,
            minWidth: 100,
        };

        let element: HTMLElement = document.createElement("div");
        let renderer: DirectionDOMRenderer = new DirectionDOMRenderer(configuration, element);

        expect(renderer.needsRender).toBe(false);
    });

    it("should need render when node is set", () => {
        let configuration: IDirectionConfiguration = {
            distinguishSequence: false,
            maxWidth: 200,
            minWidth: 100,
        };

        let element: HTMLElement = document.createElement("div");
        let renderer: DirectionDOMRenderer = new DirectionDOMRenderer(configuration, element);

        let node: Node = new Node(helper.createCoreNode());
        node.makeFull(helper.createFillNode());

        renderer.setNode(node);

        expect(renderer.needsRender).toBe(true);
    });

    it("should not need render after rendering", () => {
        let configuration: IDirectionConfiguration = {
            distinguishSequence: false,
            maxWidth: 200,
            minWidth: 100,
        };

        let element: HTMLElement = document.createElement("div");
        let renderer: DirectionDOMRenderer = new DirectionDOMRenderer(configuration, element);

        let node: Node = new Node(helper.createCoreNode());
        node.makeFull(helper.createFillNode());

        renderer.setNode(node);

        expect(renderer.needsRender).toBe(true);

        let navigator: Navigator = new Navigator("", {});

        renderer.render(navigator);

        expect(renderer.needsRender).toBe(false);
    });

    it("should not need render when setting render camera without node set", () => {
        let configuration: IDirectionConfiguration = {
            distinguishSequence: false,
            maxWidth: 200,
            minWidth: 100,
        };

        let element: HTMLElement = document.createElement("div");

        let renderer: DirectionDOMRenderer = new DirectionDOMRenderer(configuration, element);

        let renderCamera: RenderCamera = new RenderCamera(1, 1, RenderMode.Fill);
        renderCamera.camera.up.fromArray([0, 0, 1]);
        renderCamera.camera.lookat.fromArray([1, 1, 0]);
        renderer.setRenderCamera(renderCamera);

        expect(renderer.needsRender).toBe(false);
    });

    it("should not need render when setting configuration without node set", () => {
        let configuration: IDirectionConfiguration = {
            distinguishSequence: false,
            maxWidth: 200,
            minWidth: 100,
        };

        let element: HTMLElement = document.createElement("div");

        let renderer: DirectionDOMRenderer = new DirectionDOMRenderer(configuration, element);

        configuration.maxWidth = 300;
        renderer.setConfiguration(configuration);

        expect(renderer.needsRender).toBe(false);
    });

    it("should not need render when resizing without node set", () => {
        let configuration: IDirectionConfiguration = {
            distinguishSequence: false,
            maxWidth: 200,
            minWidth: 100,
        };

        let element: HTMLElement = document.createElement("div");

        let renderer: DirectionDOMRenderer = new DirectionDOMRenderer(configuration, element);

        renderer.resize(element);

        expect(renderer.needsRender).toBe(false);
    });

    it("should need render when setting changed render camera if node is set", () => {
        let configuration: IDirectionConfiguration = {
            distinguishSequence: false,
            maxWidth: 200,
            minWidth: 100,
        };

        let element: HTMLElement = document.createElement("div");
        let renderer: DirectionDOMRenderer = new DirectionDOMRenderer(configuration, element);

        let node: Node = new Node(helper.createCoreNode());
        node.makeFull(helper.createFillNode());

        renderer.setNode(node);

        expect(renderer.needsRender).toBe(true);

        let navigator: Navigator = new Navigator("", {});

        renderer.render(navigator);

        expect(renderer.needsRender).toBe(false);

        let renderCamera: RenderCamera = new RenderCamera(1, 1, RenderMode.Fill);
        renderCamera.camera.up.fromArray([0, 0, 1]);
        renderCamera.camera.lookat.fromArray([1, 1, 0]);
        renderCamera.updateRotation(renderCamera.camera);
        renderer.setRenderCamera(renderCamera);

        expect(renderer.needsRender).toBe(true);
    });

    it("should need render when setting changed configuration if node is set", () => {
        let configuration: IDirectionConfiguration = {
            distinguishSequence: false,
            maxWidth: 200,
            minWidth: 100,
        };

        let element: HTMLElement = document.createElement("div");
        let renderer: DirectionDOMRenderer = new DirectionDOMRenderer(configuration, element);

        let node: Node = new Node(helper.createCoreNode());
        node.makeFull(helper.createFillNode());

        renderer.setNode(node);

        expect(renderer.needsRender).toBe(true);

        let navigator: Navigator = new Navigator("", {});

        renderer.render(navigator);

        expect(renderer.needsRender).toBe(false);

        configuration.maxWidth = 300;
        renderer.setConfiguration(configuration);

        expect(renderer.needsRender).toBe(true);
    });

    it("should need render when resizing if node is set", () => {
        let configuration: IDirectionConfiguration = {
            distinguishSequence: false,
            maxWidth: 200,
            minWidth: 100,
        };

        let element: HTMLElement = document.createElement("div");
        let renderer: DirectionDOMRenderer = new DirectionDOMRenderer(configuration, element);

        let node: Node = new Node(helper.createCoreNode());
        node.makeFull(helper.createFillNode());

        renderer.setNode(node);

        expect(renderer.needsRender).toBe(true);

        let navigator: Navigator = new Navigator("", {});

        renderer.render(navigator);

        expect(renderer.needsRender).toBe(false);

        renderer.resize(element);

        expect(renderer.needsRender).toBe(true);
    });
});
