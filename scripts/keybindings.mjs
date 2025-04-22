export function registerKeybindings() {
    game.keybindings.register("gm-vision", "active", {
        name: "GMVISION.ToggleGMVision",
        editable: [
            { key: "KeyG", modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL] },
        ],
        restricted: true,
        onDown: () => {
            if (!game.user.isGM || game.settings.get("core", "noCanvas")) {
                return;
            }

            game.settings.set("gm-vision", "active", !game.settings.get("gm-vision", "active"));

            return true;
        },
    });
}
