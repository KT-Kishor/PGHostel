sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "../utils/validation",
  "../model/formatter"
], (BaseController, JSONModel, utils, Formatter) => {
  "use strict";
  return BaseController.extend("sap.kt.com.minihrsolution.controller.MyInbox", {
    Formatter: Formatter,
    onInit() {
      this.getRouter().getRoute("RouteMyInbox").attachMatched(this._onRouteMatched, this);
    },
    _onRouteMatched: async function () {
      // var LoginFunction = await this.commonLoginFunction("MyInbox");
      // if (!LoginFunction) return;
      var data = [{ type: "Leave" }, { type: "Expense" }, { type: "Resignation" }];
      var oTypeModel = new JSONModel(data);
      this.getView().setModel(oTypeModel, "oTypeModel");
      this.getView().getModel("LoginModel").setProperty("/HeaderName", "Inbox Details");
      this.oLoginModel = this.getOwnerComponent().getModel("LoginModel").getData();
      this.idEmp = this.oLoginModel.EmployeeID;
      //this._fetchCommonData("InboxDetails", "MyInboxModelData", { EmpID: this.idEmp });
      this._fetchCommonData("InboxDetails", "MyInboxModelData", { ManagerID: 'KT001' });

    },
    onPressback: function () {
      this.getRouter().navTo("RouteTilePage");
    },
    onLogout: function () {
      this.getRouter().navTo("RouteLoginPage");
    },
    MI_onPressButtons: function (oEvent) {
      this.getText = oEvent.getSource().getText();
      var oModel = this.getView().getModel('i18n').getResourceBundle();
      var oMsgText = this.getText === "Approve" ? "confirmApprove" : this.getText === "Reject" ? "confirmRejectleave" :
        this.getText === "Send Back" ? "confirmReSend" : "confirmPaid";
      this.functionToOpenDialog(this.getText, oModel.getText(oMsgText));
    },
    MI_onSearch: async function () {
      try {
        this.getBusyDialog();
        const aFilterItems = this.byId("MI_id_FilterBar").getFilterGroupItems();
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
        await this._fetchCommonData("InboxDetails", "MyInboxModelData", params);
        this.onBeforeShow();
        this.closeBusyDialog();
      } catch (error) {
        this.closeBusyDialog();
        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
      }
    },
    MI_onClearEmployeeDetails: function () {
      this.byId("MI_id_EmpIDFilter").setValue("");
      this.byId("MI_id_TypeFilter").setValue("");
      this.byId("MI_id_SubmittedDateFilter").setValue("");
      this.byId("MI_id_StatusFilter").setValue("");
    },
    functionToOpenDialog: function (text, oDialogTitle) {
      var oView = this.getView();
      if (!this.oDialog) {
        this.oDialog = sap.ui.core.Fragment.load({
          name: "sap.kt.com.minihrsolution.fragment.ManagerRemarks",
          controller: this
        }).then(function (oDialog) {
          this.oDialog = oDialog;
          oView.addDependent(this.oDialog);
          this.oDialog.open();
          this.valueSetFunction(text, oDialogTitle);
        }.bind(this));
      } else {
        this.oDialog.open();
        this.valueSetFunction(text, oDialogTitle);
      }
    },
    MIF_onPressClose: function () {
      this.oDialog.close();
    },
    valueSetFunction: function (text, oDialogTitle) {
      sap.ui.getCore().byId("MIF_id_OkBtn").setText(text);
      sap.ui.getCore().byId("MIF_id_remark").setValue(this.oModelData.ManagerComment);
      sap.ui.getCore().byId("MIF_id_DialogManRemark").setTitle(oDialogTitle);
    },
    onSelectionChangeStatus: function () {
      this.oModelData = this.byId("MI_id_MyInboxTable").getSelectedItem().getBindingContext("MyInboxModelData").getObject()
      if (this.oModelData.Status === "Submitted" && this.oLoginModel.Type !== "Accountant") {
        this.getView().byId("MI_id_ButApprove").setVisible(true);
        this.getView().byId("MI_id_ButReject").setVisible(true);
      } else {
        this.getView().byId("MI_id_ButApprove").setVisible(false);
        this.getView().byId("MI_id_ButReject").setVisible(false);
      }
      this.getView().byId("MI_id_ButReSend").setVisible(false);
      this.getView().byId("MI_id_ButPaid").setVisible(false);
      if ((this.oModelData.Type === "Expense" && this.oModelData.Status === "Submitted" && this.oLoginModel.Type !== "Accountant") || (this.oLoginModel.Type === "Accountant" && this.oModelData.Status === "Send to account")) {
        this.getView().byId("MI_id_ButReSend").setVisible(true);
        if (this.oLoginModel.Type === "Accountant" && this.oModelData.Status === "Send to account") this.getView().byId("MI_id_ButPaid").setVisible(true);
      }
    },
    MTF_onPressOk: function () {
      var getText = sap.ui.getCore().byId("MIF_id_OkBtn").getText();
      if (this.liveChangeForMangerComments() && sap.ui.getCore().byId("remark").getValue()) {
        this.updateCallForMyInboxFunction(this.oModelData, getText, successMsg, errorMsg);
      } else {
        sap.m.MessageToast.show(this.getView().getModel('i18n').getResourceBundle().getText("enterComments"))
      }
    },
    MIF_liveChangeForMangerComments: function () {
      const inputField = sap.ui.getCore().byId("MIF_id_remark");
      const regex = /^[^\\'"]*$/;
      if (!regex.test(inputField.getValue())) {
        inputField.setValueStateText(this.getView().getModel('i18n').getResourceBundle().getText("commentsValidation"));
        inputField.setValueState("Error");
        return false;
      } else {
        inputField.setValueState("None");
        return true;
      }
    },
    updateCallForMyInboxFunction: function (oModelData, statusValue, successMsg, errorMsg) {
      var that = this
      var sPath = "/" + "InboxDetails('" + oModelData.ID + "')";
      // Confirmation dialog
      sap.ui.core.BusyIndicator.show(0)
      // User confirmed, proceed with approval
      var remark = sap.ui.getCore().byId("remark").getValue();
      that.oDialog.close();
      oModelData.Status = statusValue;
      if (this.oLoginModel.Type === "Admin" || this.oLoginModel.Type === "Manager") oModelData.ManagerComment = remark;
      else oModelData.AccountRemark = remark;
      oModelData.NoofDays = String(oModelData.NoofDays);
      var type = oModelData.Type
      var requestData = { filters: { ID: oModelData.ID }, data: oModelData };
      this.ajaxUpdateWithJQuery("InboxDetails", requestData).then(response => {
        this.closeBusyDialog(); //  Close BusyDialog
        this.sendMailChecking(type);
        sap.ui.core.BusyIndicator.hide();
        sap.m.MessageToast.show(that.getView().getModel('i18n').getResourceBundle().getText(successMsg));
        this.onBeforeShow();
      }).catch((error) => {
        this.closeBusyDialog(); //  Close BusyDialog
        sap.m.MessageBox.error(that.getView().getModel('i18n').getResourceBundle().getText(errorMsg));
      });
    },
    onBeforeShow: function () {
      var oSmartTable = this.byId("MI_id_MyInboxTable"); // Get the SmartTable
      var oTable = oSmartTable.getTable(); // Get the internal table of SmartTable
      if (oTable && oTable.removeSelections()) {
        oTable.removeSelections();// Clear all selected rows
      }
      this.getView().byId("idButApprove").setVisible(false);
      this.getView().byId("idButReject").setVisible(false);
      this.getView().byId("idButReSend").setVisible(false);
      this.getView().byId("idButPaid").setVisible(false);
    },
    sendMailChecking: async function (type) {
      if (type === "Leave") {
        this.readCallForLeave(this.oModelData.ID);
      } else if (type === "Expense") {
        this.readCallForExpense(this.oModelData.ID);
      } else {
        var jsonAllData = {
          "EmployeeID": this.oModelData.EmpID,
          "Comments": this.oModelData.Status,
        };
        this.sendMailForExpendLeave(jsonAllData, "Resignation");
      }
    },
    readCallForLeave: function (oValue) {
      this.getOwnerComponent().getModel().read("/Leaves", {
        filters: [new sap.ui.model.Filter("ID", sap.ui.model.FilterOperator.EQ, oValue)],
        success: function (oData) {
          sap.ui.core.BusyIndicator.hide();
          if (oData.results.length > 0) {
            oData.results[0].EmpID = this.oModelData.ManagerName
            oData.results[0].Amount = oData.results[0].ManagerRemark
            oData.results[0].Comments = this.oModelData.ManagerEmailID
            oData.results[0].NoofDays = oData.results[0].NoofDays.toString();
            delete oData.results[0].ManagerRemark
            delete oData.results[0].ID
            this.sendMailForExpendLeave(oData.results[0], "LeaveMail");
          }
        }.bind(this),
        error: function (error) {
          sap.ui.core.BusyIndicator.hide();
        }
      })
    },
    readCallForExpense: function (oValue) {
      this.getOwnerComponent().getModel().read("/Expense", {
        filters: [new sap.ui.model.Filter("ExpenseID", sap.ui.model.FilterOperator.EQ, oValue), new sap.ui.model.Filter("EmployeeID", sap.ui.model.FilterOperator.EQ, this.oModelData.EmpID)],
        success: function (oData) {
          if (oData.results.length > 0) {
            var data = {
              "Name": oData.results[0].ExpenseName,
              "Status": oData.results[0].Status,
              "EmployeeID": oData.results[0].EmployeeID,
              "EmployeeName": oData.results[0].EmployeeName,
              "FromDate": oData.results[0].TotalAmount.toString(),
              "EmpID": this.oModelData.ManagerName,
              "ToDate": oData.results[0].ReimbursementAmount.toString(),
              "EmailID": this.oModelData.ManagerEmailID,
              "Comments": this.oLoginModel.Type === "Accountant" ? oData.results[0].AccountingRemark : oData.results[0].ManagerRemark
            }
            this.sendMailForExpendLeave(data, "ExpenseMail");
          }
        }.bind(this),
        error: function (error) {
          sap.ui.core.BusyIndicator.hide();
        }
      })
    },
    sendMailForExpendLeave: function (data, oType) {
      var jsonAllData = {
        data: data,
        type: oType
      };
      this.getOwnerComponent().getModel().create("/sendOTP", jsonAllData, {
        success: function () {
          sap.ui.core.BusyIndicator.hide();
        }.bind(this),
        error: function (oError) {
          sap.ui.core.BusyIndicator.hide();
        }.bind(this)
      });
    },
    MI_onPressColNavigation: function (oEvent) {
      var oData = oEvent.getSource().getBindingContext().getObject();
      if (oData.Type === "Expense") {
        this.getRouter().navTo("RouteNavigationExpense", {
          sPath: oData.ID + " MyInBox", EmployeeID: oData.EmpID
        });
      } else if (oData.Type === "Leave") {
        var oNavLeaveData = new JSONModel(oData);
        this.getOwnerComponent().setModel(oNavLeaveData, "oNavLeaveModel");
        this.getRouter().navTo("RouteDetailLeave");
      } else {
        this.getRouter().navTo("RouteSelfService", { sPara: oData.EmpID + " MyInBoxResignation" });
      }
    },
  })
}) 