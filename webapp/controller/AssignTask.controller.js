sap.ui.define([
    "./BaseController","../utils/validation", "sap/ui/model/json/JSONModel", "sap/m/MessageToast",
],
    function (BaseController,utils, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AssignTask", {
            onInit: function () {
                this.getRouter().getRoute("RouteAssignTask").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            },
            validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            AT_onPressback: function () {
                this.getRouter().navTo("RouteManageAssignment");
            },
            //open task fragment
            AT_onAssignEmpTask: function () {
                if (!this.AT_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.NewAssignment",
                        controller: this,
                    }).then(function (AT_oDialog) {
                        this.AT_oDialog = AT_oDialog;
                        this.getView().addDependent(this.AT_oDialog);
                        this.AT_oDialog.open();
                    }.bind(this));
                } else {
                    this.AT_oDialog.open();
                }
            },
            NAF_onTaskClose: function () {
                this.AT_oDialog.close();
            },
            //Submit the task details
            NAF_onSubmitTask: function () {
                try {
                    if ( utils._LCvalidateMandatoryField(sap.ui.getCore().byId("NA_id_TaskName"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("NAF_id_Description"), "ID")
                    && utils._LCvalidateDate(sap.ui.getCore().byId("NAF_id_StartDate"), "ID")&& utils._LCvalidateDate(sap.ui.getCore().byId("NAF_id_EndDate"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("NAF_id_HoursWorked"),"ID")) {
                        MessageToast.show(this.i18nModel.getText("taskAssignSucess"));
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