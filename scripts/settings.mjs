/** @type {{ active: boolean }} */
export const settings = { active: false };
export default settings;

export function registerSettings() {
    game.settings.register("gm-vision", "active", {
        scope: "client",
        config: false,
        type: Boolean,
        default: false,
        onChange: (value) => {
            if (!game.user.isGM || game.settings.get("core", "noCanvas")) {
                return;
            }

            settings.active = value;

            canvas.perception.update({ refreshVision: true });
            ui.controls.render();
        },
    });
}
