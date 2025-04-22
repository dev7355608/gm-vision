import * as hooks from "./hooks.mjs";
import TokenMixin from "./token.mjs";
import { registerKeybindings } from "./keybindings.mjs";
import { registerSettings, settings } from "./settings.mjs";
import VisualEffectsMaskingFilterMixin from "./visual-effects-masking-filter.mjs";

Hooks.once("init", () => {
    registerSettings();
    registerKeybindings();
});

Hooks.once("setup", () => {
    if (!game.user.isGM || game.settings.get("core", "noCanvas")) {
        return;
    }

    settings.active = game.settings.get("gm-vision", "active");

    CONFIG.Token.objectClass = TokenMixin(CONFIG.Token.objectClass);
    CONFIG.Canvas.visualEffectsMaskingFilter = VisualEffectsMaskingFilterMixin(CONFIG.Canvas.visualEffectsMaskingFilter);

    for (const [name, func] of Object.entries(hooks)) {
        Hooks.on(name, func);
    }
});
