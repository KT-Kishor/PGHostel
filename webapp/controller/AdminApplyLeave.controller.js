sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
  ],
  function (
    BaseController, JSONModel, MessageToast, Filter, FilterOperator, MessagePopover, MessageItem
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
        onPressClose: function () {
          this.oDialog.close();
          sap.ui.getCore().byId("idFromDate").setValueState("None");
          sap.ui.getCore().byId("idToDate").setValueState("None");
          sap.ui.getCore().byId("idLeaveComments").setValueState("None");
        },
      }
    );
  }
);
