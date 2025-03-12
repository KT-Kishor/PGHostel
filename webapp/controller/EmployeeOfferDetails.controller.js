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
			ValidateCommonFields: function (oEvent) {
				utils._LCvalidateMandatoryField(oEvent);
				this.validateStep();

			},

           
        });
    });
