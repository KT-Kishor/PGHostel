sap.ui.define([
    "./BaseController",  
    "sap/ui/core/BusyIndicator",  
],
    function (BaseController,BusyIndicator) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSA", {
            onInit: function () {
                this.getRouter().getRoute("RouteMSA").attachMatched(this._onRouteMatched, this);
                this._fetchCommonData("ManageCustomer", "CompanyNameModel");
            },
            _onRouteMatched: async function () {               
                await this.commonLoginFunction("MSA&SOW");
                await this.MSA_onSearch();
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "MSA Details");            
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onPressClear:function(){
                this.byId("MSA_id_CompanyName").setValue('');
            }, 
            onLogout: function () {
                this.CommonLogoutFunction();
            },
            MSA_AddmsaDetails:function(){
                this.getRouter().navTo("RouteMSADetails");                
            },
                       
            OnPressNavigationMsaDet:function(oEvent){               
                var MsaID = oEvent.getSource().getBindingContext("MSADisplayModel").getProperty("MsaID");
                this.getRouter().navTo("RouteMSAEdit",{sPath:MsaID})
            },

            MSA_onSearch: async function () {
                try {
                    this.getBusyDialog();
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
                    this.closeBusyDialog();
                }
            },

        });
    });