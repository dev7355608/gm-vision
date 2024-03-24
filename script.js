Hooks.once("init", () => {
    let active = false;

    game.settings.register("gm-vision", "active", {
        name: "GM Vision",
        scope: "client",
        config: false,
        type: Boolean,
        default: false,
        onChange: value => {
            if (!game.user.isGM || game.settings.get("core", "noCanvas")) {
                return;
            }

            active = value;
            canvas.perception.update({ refreshVision: true }, true);
            ui.controls.initialize();
        }
    });

    game.keybindings.register("gm-vision", "active", {
        name: "Toggle GM Vision",
        editable: [
            { key: "KeyG", modifiers: [KeyboardManager.MODIFIER_KEYS.CONTROL] }
        ],
        restricted: true,
        onDown: () => {
            if (!game.user.isGM || game.settings.get("core", "noCanvas")) {
                return;
            }

            game.settings.set("gm-vision", "active", !active);

            return true;
        }
    });

    function setup() {
        if (!game.user.isGM || game.settings.get("core", "noCanvas")) {
            return;
        }

        active = game.settings.get("gm-vision", "active");

        Hooks.on("getSceneControlButtons", controls => {
            const lighting = controls.find(c => c.name === "lighting");

            if (!lighting) {
                return;
            }

            lighting.icon = active ? "fa-solid fa-lightbulb" : "fa-regular fa-lightbulb";
        });

        Hooks.on("renderSceneControls", (app, html) => {
            const lighting = html[0].querySelector(`.scene-control[data-control="lighting"]`);

            if (!lighting) {
                return;
            }

            lighting.addEventListener("contextmenu", (event) => {
                event.preventDefault();
                game.settings.set("gm-vision", "active", !active);
            });
        });

        Hooks.on("drawCanvasVisibility", layer => {
            layer.gmVision = layer.addChild(
                new PIXI.LegacyGraphics()
                    .beginFill(0xFFFFFF)
                    .drawShape(canvas.dimensions.rect.clone())
                    .endFill());
            layer.gmVision.visible = false;
        });

        Hooks.on("sightRefresh", layer => {
            layer.gmVision.visible = active;
            canvas.effects.illumination.filter.uniforms.gmVision = active;
        });

        if (foundry.utils.isNewerVersion(11, game.version)) {
            libWrapper.register(
                "gm-vision",
                "CanvasVisibility.prototype.restrictVisibility",
                function (wrapped) {
                    for (const token of canvas.tokens.placeables) {
                        token.gmVisible = false;
                    }

                    return wrapped();
                },
                libWrapper.WRAPPER,
                { perf_mode: libWrapper.PERF_FAST }
            );
        }

        libWrapper.register(
            "gm-vision",
            "Token.prototype.isVisible",
            function (wrapped) {
                this.detectionFilter = undefined;

                const visible = wrapped();

                if (!visible && active || visible && this.document.hidden) {
                    this.detectionFilter = filter;
                    this.gmVisible = true;

                    return true;
                }

                this.gmVisible = false;

                return visible;
            },
            libWrapper.WRAPPER,
            { perf_mode: libWrapper.PERF_FAST }
        );

        class GMVisionDetectionFilter extends AbstractBaseFilter {
            /** @override */
            static vertexShader = `\
                attribute vec2 aVertexPosition;

                uniform vec4 inputSize;
                uniform vec4 outputFrame;
                uniform mat3 projectionMatrix;
                uniform vec2 origin;
                uniform mediump float thickness;

                varying vec2 vTextureCoord;
                varying float vOffset;

                void main() {
                    vTextureCoord = (aVertexPosition * outputFrame.zw) * inputSize.zw;
                    vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.0)) + outputFrame.xy;
                    vec2 offset = position - origin;
                    vOffset = (offset.x + offset.y) / (2.0 * thickness);
                    gl_Position = vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
                }
            `;

            /** @override */
            static fragmentShader = `\
                varying vec2 vTextureCoord;
                varying float vOffset;

                uniform sampler2D uSampler;
                uniform mediump float thickness;

                void main() {
                    float x = abs(vOffset - floor(vOffset + 0.5)) * 2.0;
                    float y0 = clamp((x + 0.5) * thickness + 0.5, 0.0, 1.0);
                    float y1 = clamp((x - 0.5) * thickness + 0.5, 0.0, 1.0);
                    float y = y0 - y1;
                    float alpha = texture2D(uSampler, vTextureCoord).a * 0.25;
                    gl_FragColor = vec4(y, y, y, 1.0) * alpha;
                }
            `;

            /** @override */
            static defaultUniforms = {
                origin: { x: 0, y: 0 },
                thickness: 1
            };
        }

        const filter = GMVisionDetectionFilter.create();

        Hooks.on("canvasPan", (canvas, { x, y, scale }) => {
            const { width, height } = canvas.app.screen;
            filter.uniforms.origin.x = width / 2 - x * scale;
            filter.uniforms.origin.y = height / 2 - y * scale;
            filter.uniforms.thickness = (canvas.dimensions.size / 25) * scale;
        });

        VisualEffectsMaskingFilter.defaultUniforms.gmVision = false;
        VisualEffectsMaskingFilter.POST_PROCESS_TECHNIQUES.GM_VISION = {
            id: "GM_VISION",
            glsl: `if (gmVision) finalColor.rgb = sqrt(finalColor.rgb) * 0.5 + 0.5;`
        };

        libWrapper.register(
            "gm-vision",
            "VisualEffectsMaskingFilter.fragmentHeader",
            function (wrapped, filterMode) {
                let header = wrapped(filterMode);

                if (filterMode === VisualEffectsMaskingFilter.FILTER_MODES.ILLUMINATION) {
                    header += "\nuniform bool gmVision;\n";
                }

                return header;
            },
            libWrapper.WRAPPER
        );

        libWrapper.register(
            "gm-vision",
            "VisualEffectsMaskingFilter.fragmentShader",
            function (wrapped, filterMode, postProcessModes = []) {
                if (filterMode === VisualEffectsMaskingFilter.FILTER_MODES.ILLUMINATION) {
                    postProcessModes = [...postProcessModes, "GM_VISION"];
                }

                return wrapped(filterMode, postProcessModes);
            },
            libWrapper.WRAPPER
        );
    };

    if (foundry.utils.isNewerVersion(game.version, 11)) {
        Hooks.once("setup", setup);
    } else {
        Hooks.once("setup", () => {
            if (!game.settings.get("core", "noCanvas")) {
                Hooks.once("canvasInit", setup);
            }
        });
    }
});
