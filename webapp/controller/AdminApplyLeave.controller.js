sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
    "../utils/validation"
  ],
  function (
    BaseController, JSONModel, MessageToast, Filter, FilterOperator, MessagePopover, MessageItem,utils
  ) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.AdminApplyLeave",
      {
        onInit: function () {
          this.getRouter().getRoute("RouteAdminApplyLeave").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
          var that = this;
          that.i18nModelMess = that.getView().getModel("i18n").getResourceBundle();
          that.byId("idLeaveBarChart").setVisible(false);
          that.byId("idLeaveTableStandard").setVisible(true);
          that.byId("idleavefilterbar").setVisible(true);
          that.byId("idLeaveYear").setValue(new Date().getFullYear());
        },
        onPressApplyLeave: function () {
          var oView = this.getView();
          var currentYear = new Date().getFullYear();
          var leaveJson = {
            EmployeeID: "",
            EmployeeName: "",
            Email: "",
            FromDate: "",
            ToDate: "",
            NoofDays: "",
            TypeOfLeave: "All In One Leave",
            Comments: "",
            Submit: true,
            Save: false,
            HalfDay: false,
            MinToDate: null,
            ManagerRemark: "",
            maxDate: new Date(currentYear, 11, 31),
            // minDate: new Date(this.JoiningDate[2], this.JoiningDate[1] - 1, this.JoiningDate[0])
          };
          var oLeaveTempModel = new JSONModel(leaveJson);
          this.getView().setModel(oLeaveTempModel, "LeaveTempModel");
          this.openLeaveDialog(oView);
        },
        // Open the leave dialog fragment
        openLeaveDialog: function (oView) {
          if (!this.oDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.ApplyLeave",
              controller: this,
            }).then(
              function (oDialog) {
                this.oDialog = oDialog;
                oView.addDependent(this.oDialog);
                this.oDialog.open();
              }.bind(this)
            );
          } else {
            this.oDialog.open();
          }
        },
        // Close the leave dialog fragment
        AL_onPressClose: function () {
          this.oDialog.close();
          sap.ui.getCore().byId("AL_id_FromDate").setValueState("None");
          sap.ui.getCore().byId("AL_id_ToDate").setValueState("None");
          sap.ui.getCore().byId("AL_id_LeaveComments").setValueState("None");
        },
        validateDate: function (oEvent) {
          utils._LCvalidateDate(oEvent);
        },
        ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        AL_onSignout: function () {
          this.getRouter().navTo("RouteLoginPage");
        },
        AL_onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },
      AL_onPressSubmit: function (oEvent) {
        try {
            if (
              utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_FromDate"), "ID") &&
              utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_ToDate"), "ID") &&
              utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AL_id_LeaveComments"), "ID")) {
            } else {
                sap.m.MessageToast.show("Make sure all the mandatory fields are filled and validate the entered value");
            }
        } catch (error) {
            sap.m.MessageToast.show("Technical error, please contact the administrator");
        }
    },
      }
    );
  }
);
