sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation"
  ],
  function (
    BaseController, JSONModel, MessageToast,utils) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.AdminApplyLeave",
      {
        onInit: function () {
          this.getRouter().getRoute("RouteAdminApplyLeave").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
          var that = this;
          that.getView().getModel("LoginModel").setProperty("/HeaderName", "Leave Application"); 
          that.i18nModel = that.getView().getModel("i18n").getResourceBundle();
          that.byId("AL_id_LeaveBarChart").setVisible(false);
          that.byId("AL_id_LeaveTableStandard").setVisible(true);
          that.byId("AL_id_leavefilterbar").setVisible(true);
          that.byId("AL_id_LeaveYear").setValue(new Date().getFullYear());
        },

        AL_onPressApplyLeave: function () {
          var oView = this.getView();
          var loginData = this.getOwnerComponent().getModel("LoginModel").getData()
          var currentYear = new Date().getFullYear();
          var leaveJson = {
            EmployeeID: loginData.EmployeeID,
            EmployeeName: loginData.EmployeeName,
            Email: loginData.EmailID,
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

        AL_ValidateDate: function (oEvent) {
          utils._LCvalidateDate(oEvent);
        },

        AL_ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
          this.getRouter().navTo("RouteLoginPage");
        },

        AL_onPressSubmit: function () {
        try {
          var that=this;
            if (
              utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_FromDate"), "ID") &&
              utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_ToDate"), "ID") &&
              utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AL_id_LeaveComments"), "ID")) {
            } else {
              sap.m.MessageToast.show(that.i18nModel.getText("mandetoryFields"));
            }
        } catch (error) {
          sap.m.MessageToast.show(that.i18nModel.getText("commonErrorMessage"));
        }
      },
      }
    );
  }
);
