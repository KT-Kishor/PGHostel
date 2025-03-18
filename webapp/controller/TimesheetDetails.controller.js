sap.ui.define([
    "./BaseController","../utils/validation", "sap/ui/model/json/JSONModel","sap/m/MessageToast",],
    function (BaseController, utils, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.TimesheetDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteTimesheetDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            },
            ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            TSD_onPressBack: function () {
                this.getRouter().navTo("RouteTimesheet");
            },
            onValueHelpRequest:function(){
                if (!this.TSD_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.TimesheetTask",
                        controller: this,
                    }).then(function (TSD_oDialog) {
                        this.TSD_oDialog = TSD_oDialog;
                        this.getView().addDependent(this.TSD_oDialog);
                        this.TSD_oDialog.open();
                    }.bind(this));
                } else {
                    this.TSD_oDialog.open();
                }
            },
            TSD_onSubmit:function(){
                try {
                    if (utils._LCvalidateMandatoryField(this.byId("TSD_id_Assignment"), "ID") && utils._LCvalidateMandatoryField(this.byId("TSD_id_TimeHours"), "ID") && utils._LCvalidateMandatoryField(this.byId("TSD_id_EmpComment"), "ID")) {
                        MessageToast.show(this.i18nModel.getText("timesheetSuccess"));
                    }
                    else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                }
                catch {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            }     
        });
    });