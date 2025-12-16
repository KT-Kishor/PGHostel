    /**
     * eslint-disable @sap/ui5-jsdocs/no-jsdoc
     */

    sap.ui.define([
            "sap/ui/core/UIComponent",
            "sap/ui/Device",
            "sap/ui/com/project1/model/models",
            "sap/ui/model/json/JSONModel",
        ],
        function (UIComponent, Device, models,JSONModel) {
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
                init: function () {
                    // call the base component's init function
                    UIComponent.prototype.init.apply(this, arguments);

                    // enable routing
                    this.getRouter().initialize();

                    // set the device model
                    this.setModel(models.createDeviceModel(), "device");

                     var oUIModel = new sap.ui.model.json.JSONModel({
                        isLoggedIn: false
                    });
                    this.setModel(oUIModel, "UIModel");

                     // Login model setup
                    var omodel = new sap.ui.model.json.JSONModel({
                        url: "https://rest.kalpavrikshatechnologies.com/",
                        headers: {
                            name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                            password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                            "Content-Type": "application/json"
                        },
                        isRadioVisible: false
                    });
                    this.setModel(omodel, "LoginModel");

                    this._fetchCommonData("City", "CityModel");                   
                    this._fetchCommonData("State", "StateModel");
                    this._fetchCommonData("Country", "CountryModel");
                    this._fetchCommonData("BaseLocation", "BaseLocationModel");
                    this._fetchCommonData("HM_Branch", "sBRModel");
                    this._fetchCommonData("Currency", "CurrencyModel");

                },
                _fetchCommonData: async function (entityName, modelName, filter = "") {
                // If already loaded, skip
                if (this.getModel(modelName)) return;

                const url =  "https://rest.kalpavrikshatechnologies.com/" + entityName;
                const headers = {
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                    "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                "Content-Type": "application/json",
                } ;

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
                    MessageToast.show(error?.responseJSON?.message || "Error loading " + entityName);
                }
            }
            });
        }
    );