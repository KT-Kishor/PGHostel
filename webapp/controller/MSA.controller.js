sap.ui.define([
    "./BaseController",  
    "sap/ui/core/BusyIndicator",  
],
    function (BaseController,BusyIndicator) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSA", {
            onInit: function () {
                this.getRouter().getRoute("RouteMSA").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function () {
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "MSA Details");
                this.MSA_onSearch();
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            MSA_AddmsaDetails:function(){
                this.getRouter().navTo("RouteMSADetails");
                
            },
            MSA_EditMsaDetails:function(){
                this.getRouter().navTo("RouteMSAEdit")
            },

            MSA_onSearch: async function () {
                try {
                    BusyIndicator.show(0);		
                    const aFilterItems = this.byId("MSA_id_AdminFilter").getFilterGroupItems();
                    const params = {};
            
                    aFilterItems.forEach(function (oItem) {
                        const oControl = oItem.getControl();
                        const sKey = oItem.getName();
            
                        if (oControl && typeof oControl.getValue === "function") {
                            const sValue = oControl.getValue().trim();
            
                            if (sValue) {
                                params[sKey] = sValue;
                            }
                        }
                    });
                    await this._fetchCommonData("MSADetails", "MSADisplayModel", params);					
            
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                } finally {
                    BusyIndicator.hide();
                }
            },

        });
    });