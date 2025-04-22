import settings from "./settings.mjs";

/** @type {PIXI.LegacyGraphics|undefined} */
let revealFog;

/**
 * @param {foundry.canvas.groups.CanvasVisibility} group
 */
export function drawCanvasVisibility(group) {
    revealFog = group.addChild(
        new PIXI.LegacyGraphics()
            .beginFill(0xFFFFFF)
            .drawShape(canvas.dimensions.rect)
            .endFill());
    revealFog.visible = false;
}

/**
 * @param {foundry.canvas.groups.CanvasVisibility} group
 */
export function sightRefresh(group) {
    revealFog.visible = settings.active;
    canvas.effects.illumination.filter.uniforms.gmVision = settings.active;
    canvas.effects.darkness.filter.alpha = settings.active ? 0.5 : 1.0;
}

/**
 * @param {foundry.canvas.layers.CanvasDarknessEffects} layer
 */
export function drawCanvasDarknessEffects(layer) {
    const index = layer.filters?.indexOf(layer.filter);

    layer.filter = new PIXI.AlphaFilter();

    if (index >= 0) {
        layer.filters[index] = layer.filter;
    }
}

/**
 * @param {foundry.applications.ui.SceneControls} application
 * @param {HTMLElement} element
 * @param {foundry.applications.types.ApplicationRenderContext} context
 * @param {foundry.applications.types.SceneControlsRenderOptions} options
 */
export function renderSceneControls(application, element, context, options) {
    if (!options.parts.includes("layers")) {
        return;
    }

    const lighting = element.querySelector(`[data-control="lighting"]`);

    if (!lighting) {
        return;
    }

    if (settings.active) {
        lighting.classList.replace("fa-regular", "fa-solid");
    } else {
        lighting.classList.replace("fa-solid", "fa-regular");
    }

    lighting.addEventListener("contextmenu", (event) => {
        event.preventDefault();

        game.settings.set("gm-vision", "active", !settings.active);
    });
}
