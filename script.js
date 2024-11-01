Hooks.once("init", () => {
    let active = false;

    game.settings.register("gm-vision", "active", {
        scope: "client",
        config: false,
        type: Boolean,
        default: false,
        onChange: (value) => {
            if (!game.user.isGM || game.settings.get("core", "noCanvas")) {
                return;
            }

            active = value;

            canvas.perception.update({ refreshVision: true });
            ui.controls.render();
        },
    });

    game.keybindings.register("gm-vision", "active", {
        name: "Toggle GM Vision",
        editable: [
            { key: "KeyG", modifiers: [game.keyboard.constructor.MODIFIER_KEYS.CONTROL] },
        ],
        restricted: true,
        onDown: () => {
            if (!game.user.isGM || game.settings.get("core", "noCanvas")) {
                return;
            }

            game.settings.set("gm-vision", "active", !active);

            return true;
        },
    });

    Hooks.once("setup", () => {
        if (!game.user.isGM || game.settings.get("core", "noCanvas")) {
            return;
        }

        active = game.settings.get("gm-vision", "active");

        Hooks.on("renderSceneControls", (app, html) => {
            const lighting = html.querySelector(`[data-control="lighting"]`);

            if (!lighting) {
                return;
            }

            if (active) {
                lighting.classList.replace("fa-regular", "fa-solid");
            } else {
                lighting.classList.replace("fa-solid", "fa-regular");
            }

            lighting.addEventListener("contextmenu", (event) => {
                event.preventDefault();

                game.settings.set("gm-vision", "active", !active);
            });
        });

        let revealFog;

        Hooks.on("drawCanvasVisibility", (layer) => {
            revealFog = layer.addChild(
                new PIXI.LegacyGraphics()
                    .beginFill(0xFFFFFF)
                    .drawShape(canvas.dimensions.rect)
                    .endFill());
            revealFog.visible = false;
        });

        Hooks.on("drawCanvasDarknessEffects", (layer) => {
            const index = layer.filters?.indexOf(layer.filter);

            layer.filter = new PIXI.AlphaFilter();

            if (index >= 0) {
                layer.filters[index] = layer.filter;
            }
        });

        Hooks.on("sightRefresh", () => {
            revealFog.visible = active;
            canvas.effects.illumination.filter.uniforms.gmVision = active;
            canvas.effects.darkness.filter.alpha = active ? 0.5 : 1;
        });

        class HatchFilter extends foundry.canvas.rendering.filters.AbstractBaseFilter {
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
                    vOffset = (offset.x + offset.y) / (1.414213562373095 * 2.0 * thickness);
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
                thickness: 1,
            };

            /** @override */
            apply(filterManager, input, output, clearMode, currentState) {
                const uniforms = this.uniforms;
                const worldTransform = currentState.target.worldTransform;

                uniforms.origin.x = worldTransform.tx;
                uniforms.origin.y = worldTransform.ty;
                uniforms.thickness = canvas.dimensions.size / 25 * canvas.stage.scale.x;

                super.apply(filterManager, input, output, clearMode, currentState);
            }
        }

        const hatchFilter = HatchFilter.create();

        CONFIG.Token.objectClass = class extends CONFIG.Token.objectClass {
            /** @override */
            get isVisible() {
                const visible = super.isVisible;

                if (!visible && active || visible && this.document.hidden) {
                    this.detectionFilter = hatchFilter;

                    return true;
                }

                return visible;
            }
        };

        CONFIG.Canvas.visualEffectsMaskingFilter = class extends CONFIG.Canvas.visualEffectsMaskingFilter {
            /** @override */
            static defaultUniforms = {
                ...super.defaultUniforms,
                gmVision: false,
            };

            /** @override */
            static fragmentHeader = `
                    ${super.fragmentHeader}

                    uniform bool gmVision;
                `;

            /** @override */
            static fragmentPostProcess(postProcessModes) {
                return `
                        ${super.fragmentPostProcess(postProcessModes)}

                        if (mode == ${this.FILTER_MODES.ILLUMINATION} && gmVision) {
                            finalColor.rgb = sqrt(finalColor.rgb) * 0.5 + 0.5;
                        }
                    `;
            }
        };
    });
});
