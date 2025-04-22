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
                this.commonLoginFunction("MSA&SOW");
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "MSA Details");
                this.MSA_onSearch();
                BusyIndicator.hide();
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.CommonLogoutFunction();
            },
            MSA_AddmsaDetails:function(){
                this.getRouter().navTo("RouteMSADetails");                
            },
                       
            OnPressNavigationMsaDet:function(oEvent){
                BusyIndicator.show(0);
                var MsaID = oEvent.getSource().getBindingContext("MSADisplayModel").getProperty("MsaID");
                this.getRouter().navTo("RouteMSAEdit",{sPath:MsaID})
            },

            MSA_onSearch: async function () {
                try {
                    var oTable = this.byId("MSA_id_Table");
                    oTable.setBusy(true);
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
                    oTable.setBusy(false); 
                }
            },

        });
    });