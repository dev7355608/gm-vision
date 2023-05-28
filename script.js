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

        libWrapper.register(
            "gm-vision",
            "Token.prototype.isVisible",
            function (wrapped) {
                this.detectionFilter = undefined;
                this.gmVisible = false;

                const visible = wrapped();

                if (active && !visible || this.document.hidden && canvas.effects.visionSources.some(s => s.active)) {
                    this.detectionFilter = GMVisionDetectionFilter.instance;
                    this.gmVisible = true;
                }

                return visible || active;
            },
            libWrapper.WRAPPER,
            { perf_mode: libWrapper.PERF_FAST }
        );

        class GMVisionDetectionFilter extends AbstractBaseFilter {
            /** @type {GMVisionDetectionFilter} */
            static #instance;

            /**
             * The instance of this shader.
             * @type {GMVisionDetectionFilter}
             */
            static get instance() {
                return this.#instance ??= this.create();
            }

            /** @override */
            static defaultUniforms = {
                alphaScale: 1,
                alphaThreshold: 0.6,
                outlineColor: [1, 1, 1, 1],
                thickness: 1
            };

            /** @override */
            static vertexShader = `\
                attribute vec2 aVertexPosition;

                uniform vec4 inputSize;
                uniform vec4 outputFrame;
                uniform mat3 projectionMatrix;

                varying vec2 vTextureCoord;

                void main() {
                    vTextureCoord = aVertexPosition * (outputFrame.zw * inputSize.zw);
                    vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;
                    gl_Position = vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
                }`;

            /** @override */
            static get fragmentShader() {
                return `\
                    varying vec2 vTextureCoord;

                    uniform sampler2D uSampler;
                    uniform vec4 inputPixel;
                    uniform vec4 inputClamp;
                    uniform vec4 outlineColor;
                    uniform float thickness;
                    uniform float alphaScale;
                    uniform float alphaThreshold;

                    float sampleAlpha(vec2 textureCoord) {
                        return smoothstep(alphaThreshold, 1.0, alphaScale * texture2D(uSampler, clamp(textureCoord, inputClamp.xy, inputClamp.zw)).a);
                    }

                    void main(void) {
                        float innerAlpha = sampleAlpha(vTextureCoord);
                        float outerAlpha = innerAlpha;

                        for (float angle = 0.0; angle < ${(2 * Math.PI - this.#quality / 2).toFixed(7)}; angle += ${this.#quality.toFixed(7)}) {
                            vec2 offset = inputPixel.zw * vec2(cos(angle), sin(angle)) * thickness;
                            outerAlpha = max(outerAlpha, sampleAlpha(vTextureCoord + offset));
                        }

                        vec2 pixelCoord = vTextureCoord * inputPixel.xy;
                        float hatchAlpha = thickness > 1.0 ? smoothstep(0.0, 1.0, sin(2.2214415 / thickness * (pixelCoord.x + pixelCoord.y)) + 0.5) : 0.5;

                        gl_FragColor = outlineColor * (max((1.0 - innerAlpha) * outerAlpha, innerAlpha * hatchAlpha * 0.5) * 0.5);
                    }`;
            }

            /**
             * Quality of the outline according to performance mode.
             * @returns {number}
             */
            static get #quality() {
                switch (canvas.performance.mode) {
                    case CONST.CANVAS_PERFORMANCE_MODES.LOW:
                        return (Math.PI * 2) / 8;
                    case CONST.CANVAS_PERFORMANCE_MODES.MED:
                        return (Math.PI * 2) / 12;
                    default:
                        return (Math.PI * 2) / 16;
                }
            }

            /** @override */
            static create(uniforms) {
                const shader = super.create(uniforms);

                shader.#updatePadding();

                return shader;
            }

            #updatePadding() {
                this.padding = this.uniforms.thickness;
            }

            /**
             * The thickness of the outline.
             * @returns {number}
             */
            get thickness() {
                return this.uniforms.thickness;
            }

            set thickness(value) {
                this.uniforms.thickness = value;
                this.#updatePadding();
            }

            /** @override */
            get autoFit() {
                return this.uniforms.thickness <= 1;
            }

            set autoFit(value) { }

            /** @override */
            apply(filterManager, input, output, clear, currentState) {
                this.uniforms.alphaScale = 1 / (currentState.target.worldAlpha || 1);
                filterManager.applyFilter(this, input, output, clear);
            }
        }

        Hooks.on("canvasPan", (canvas, constrained) => {
            GMVisionDetectionFilter.instance.thickness = Math.max(2 * Math.abs(constrained.scale), 1);
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
