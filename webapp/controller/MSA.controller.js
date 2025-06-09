sap.ui.define([
    "./BaseController",  
],
    function (BaseController,) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSA", {
            onInit: function () {
                this.getRouter().getRoute("RouteMSA").attachMatched(this._onRouteMatched, this);
                this._fetchCommonData("ManageCustomer", "CompanyNameModel");
            },
            _onRouteMatched: async function () {   
                try{
                var LoginFUnction = await this.commonLoginFunction("MSA&SOW");
                if (!LoginFUnction) return;
                await this.MSA_onSearch();
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "MSA Details");  
                } catch (error) {
                  sap.m.MessageToast.show(error.message || error.responseText);
                } finally {
                    this.closeBusyDialog(); // Close after async call finishes
                }                  
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onPressClear:function(){
                this.byId("MSA_id_CompanyName").setValue('');
            }, 
            MSA_onAddCustomer:function () {
                this.getRouter().navTo("RouteManageCustomer",{value:"MSA"});
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
                    this.closeBusyDialog();
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                } finally {
                    this.closeBusyDialog();
                }
            },

        });
    });