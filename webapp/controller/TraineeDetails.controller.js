sap.ui.define([
    "./BaseController", //call base controller
    "../utils/validation", //call validation
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem"

],
    function (BaseController, utils, JSONModel, MessageToast, Filter, FilterOperator, MessagePopover, MessageItem) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.TraineeDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteTraineeDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function (oEvent) {
                this.byId("TD_id_Wizard").getSteps()[0].setValidated(false);
            },
            validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
                this.validateStep();
            },
            validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
                this.validateStep();
            },
            validateAmount: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
                this.validateStep();
            },
            validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
                this.validateStep();
            },
            T_onPressback: function () {
                this.getRouter().navTo("RouteTrainee");
            },
            // Common Model
            CommonModel: function () {
                var oModel = new JSONModel({
                    TSalutation: "Mr.",
                    TraineeName: "",
                    RSalutation: "Mr",
                    ReportingManager: "",
                    EmailID: "",
                    Stipend: "",
                    JoiningDate: new Date(),
                });
                this.getView().setModel(oModel, "oTraineeDetails");
            },
            validateStep: function () {
                var oView = this.getView();
                var isValid = utils._LCvalidateName(oView.byId("TD_id_Name"), "ID") &&
                    utils._LCvalidateName(oView.byId("TD_id_ReportingManager"), "ID") &&
                    utils._LCvalidateEmail(oView.byId("TD_id_EmailID"), "ID") &&
                    utils._LCvalidateAmount(oView.byId("TD_id_Stipend"), "ID") &&
                    utils._LCvalidateDate(oView.byId("TD_id_JoiningDate"), "ID");

                this.byId("TD_id_Wizard").getSteps()[0].setValidated(isValid);
            },
            TD_onSubmitData: function (oEvent) {
                try {
                    if (this.byId("TD_id_Wizard").getSteps()[0].getValidated()) {
                        MessageToast.show("Data Saved Successfully");
                    } else {
                        sap.m.MessageToast.show("Make sure all the mandatory fields are filled and validate the entered values");
                    }
                } catch (error) {
                    sap.m.MessageToast.show("Technical error please connect to administrator");
                }
            }
        });
    });
