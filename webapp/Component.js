/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/com/project1/model/models",
    "sap/ui/model/json/JSONModel",
    "sap/m/Carousel",
],
    function (UIComponent, Device, models, JSONModel, Carousel) {
        "use strict";

        return UIComponent.extend("sap.ui.com.project1.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: async function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);


                // --- Global virtual keyboard / carousel slide blocker ---
                window.isVirtualKeyboardActive = false;

                // Helper function to detect if an element accepts text input (triggers keyboard)
                var fnIsInputField = function (el) {
                    if (!el) { return false; }
                    var sTagName = el.tagName;
                    var sType = el.type ? el.type.toLowerCase() : "";

                    // Core input tags
                    if (sTagName === "INPUT" || sTagName === "TEXTAREA" || el.isContentEditable) {
                        // Ignore buttons, checkboxes, radio buttons hidden types which do NOT open keyboard
                        var aNonInputTypes = ["button", "checkbox", "radio", "submit", "image", "hidden", "file"];
                        if (sTagName === "INPUT" && aNonInputTypes.includes(sType)) {
                            return false;
                        }
                        return true;
                    }
                    return false;
                };

                window.addEventListener("focusin", function (e) {
                    if (fnIsInputField(e.target)) {
                        window.isVirtualKeyboardActive = true;
                    }
                });

                window.addEventListener("focusout", function (e) {
                    // Short timeout covers the transition when moving between fields inside forms
                    setTimeout(function () {
                        if (!fnIsInputField(document.activeElement)) {
                            window.isVirtualKeyboardActive = false;
                        }
                    }, 300);
                });

                // Monkey-patch sap.m.Carousel.prototype.next to block auto-slide while keyboard is active
                var _origCarouselNext = Carousel.prototype.next;
                Carousel.prototype.next = function () {
                    if (window.isVirtualKeyboardActive) {
                        // Return the carousel instance to maintain method chaining without triggering rendering
                        return this;
                    }
                    return _origCarouselNext.apply(this, arguments);
                };
                // --- End global override ---

                 var aImages = [
                sap.ui.require.toUrl("sap/ui/com/project1/image/BedHostel.png"),
                sap.ui.require.toUrl("sap/ui/com/project1/image/Home2.jpg"),
                sap.ui.require.toUrl("sap/ui/com/project1/image/Home3.jpg"),
                sap.ui.require.toUrl("sap/ui/com/project1/image/Home4.jpg"),
                sap.ui.require.toUrl("sap/ui/com/project1/image/Home5.jpg")
            ];

            this._aPreloadedImages = [];
            this._imagesLoaded = false;

            var iLoaded = 0;

            aImages.forEach(function (sSrc) {

                var oImg = new Image();

                oImg.onload = function () {

                    iLoaded++;

                    if (iLoaded === aImages.length) {
                        this._imagesLoaded = true;
                    }

                }.bind(this);

                oImg.src = sSrc;

                this._aPreloadedImages.push(sSrc);

            }.bind(this));

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                var oUIModel = new JSONModel({
                    isLoggedIn: false
                });
                this.setModel(oUIModel, "UIModel");
                this.setModel(new JSONModel({}), "UserModel");
                var oGuideModel = new JSONModel();
                oGuideModel.loadData("model/informationUser.json");
                this.setModel(oGuideModel, "guideModel");
                // Login model setup
                var omodel = new sap.ui.model.json.JSONModel({
                    url: "https://rest.kalpavrikshatechnologies.com/stayvriksha/",
                    headers: {
                        name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                        password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                        "Content-Type": "application/json"
                    },
                    isRadioVisible: false
                });
                this.setModel(omodel, "LoginModel");
                this.getRootControl().setBusy(true);
                this._fetchCommonData("City", "CityModel");
                this._fetchCommonData("State", "StateModel");
                this._fetchCommonData("Country", "CountryModel");
                this._fetchCommonData("Currency", "CurrencyModel");
                this._fetchCommonData("HM_FacilityType", "FacilityTypeModel");
                this._fetchCommonData("HM_AmenitiName", "AmenityNameModel");


                await this._fetchCommonData("HM_BranchData", "sBRModel");
                this.getRootControl().setBusy(false);

                const oAppStateModel = new JSONModel({
                    previousTab: "idHome", // default value
                    });
                this.setModel(oAppStateModel, "AppStateModel");

                const oComplaintTypeModel = new sap.ui.model.json.JSONModel();
                oComplaintTypeModel.loadData("model/ComplaintTypes.json");
                this.setModel(oComplaintTypeModel, "ComplaintTypeModel");
            },
            _fetchCommonData: async function (entityName, modelName, filter = "") {
                // If already loaded, skip
                if (this.getModel(modelName)) return;

                const url = "https://rest.kalpavrikshatechnologies.com/stayvriksha/" + entityName;
                const headers = {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password:
                        "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                    "Content-Type": "application/json",
                };

                try {
                    const result = await new Promise((resolve, reject) => {
                        $.ajax({
                            url: url,
                            method: "GET",
                            headers: headers,
                            data: filter,
                            success: function (data) {
                                resolve(data);
                            },
                            error: function (err) {
                                reject(err);
                            }
                        });
                    });

                    if (result && result.data) {
                        const oModel = new JSONModel(result.data);
                        this.setModel(oModel, modelName);
                    }
                } catch (error) {
                    sap.m.MessageToast.show(error?.responseJSON?.message || "Error loading " + entityName);
                }
            }
        });
    }
);