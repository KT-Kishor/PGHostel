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
            },
            validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            validateAmount: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
            },
            validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            T_onPressback:function(){
                this.getRouter().navTo("RouteTrainee");
            },

            //common mode
            CommonModel: function () {
                var oModel = new JSONModel({
                    TSalutation: "Mr.",
                    TraineeName: "",
                    RSalutation: "Mr",
                    ReportingManager: "",
                    EmailID: "",
                    Stipend: "",
                    "JoiningDate": new Date(),

                });
                this.getView().setModel(oModel, "oTraineeDetails");
            },
            TD_onSubmitData: function (oEvent) {
                try {
                    // Check if all the fields are validated
                    if (utils._LCvalidateName(this.byId("TD_id_Name"), "ID") &&
                        utils._LCvalidateName(this.byId("TD_id_ReportingManager"), "ID") &&
                        utils._LCvalidateEmail(this.byId("TD_id_EmailID"), "ID") &&
                        utils._LCvalidateAmount(this.byId("TD_id_Stipend"), "ID") &&
                        utils._LCvalidateDate(this.byId("TD_id_JoiningDate"), "ID")) {

                        this.byId("TD_id_Wizard").getSteps()[0].setValidated(true);

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