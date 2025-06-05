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

    _onRouteMatched: async function (OEvent) {
      var LoginFUnction = await this.commonLoginFunction("MyInbox");
      if (!LoginFUnction) return; 
      this.getView().getModel("PaySlip").setProperty("/isRouteLOP", false);
      const sParams = OEvent.getParameter("arguments").sMyInBox;
      const oView = this.getView();
      const oLoginModel = oView.getModel("LoginModel");
      const oLoginData = oLoginModel.getData();
      this.oLoginModel = oLoginData;
      const oComponent = this.getOwnerComponent();
      const isAccountMgr = oLoginData.Role === "Account Manager" || oLoginData.Role === "Account Consultant";

      this.sParams = sParams;
      oView.setModel(new JSONModel([{ type: "Leave" }, { type: "Expense" }, { type: "Resignation" }]), "oTypeModel");
      oLoginModel.setProperty("/HeaderName", "Inbox Details");
      this.i18nModel = oView.getModel("i18n").getResourceBundle;
      this.idEmp = oLoginData.EmployeeID;

      const statusFilter = isAccountMgr ? "Send to account" : "Submitted";
      const filter = isAccountMgr ? { Status: statusFilter } : { ManagerID: this.idEmp, Status: statusFilter };

      if (sParams === "MyInboxView") {
        this.MI_onClearEmployeeDetails();
        this.byId("MI_id_StatusFilter").setValue(statusFilter);
        await this._fetchCommonData("InboxDetails", "MyInboxModelData", filter);
      } else {
        this.MI_onSearch();
      }

      oView.byId("MI_id_LOPDetBut").setVisible(isAccountMgr);
      if (isAccountMgr) {
        oComponent.getModel("MyInbox").setData([
          { ID: 1, StatusName: "Send to account" },
          { ID: 2, StatusName: "Paid" }
        ]);
      }

      const response = await this.ajaxReadWithJQuery("InboxDetails", isAccountMgr ? { Status: "Send to account" } : { ManagerID: this.idEmp });
      if (response.data?.length) {
        const empData = [...new Map(response.data.filter(item => item.EmpID?.trim()).map(item => [item.EmpID.trim(), item])).values()];
        oView.setModel(new JSONModel(empData), "oModelEmp");
      }
    },

    MI_onPressLOPData: function () {
      //const oData = this.byId("MI_id_MyInboxTable").getSelectedItem().getBindingContext("MyInboxModelData").getObject();
      this.getRouter().navTo("RouteLOPDetails");
    },
    onPressback() {
      this.getRouter().navTo("RouteTilePage");
    },

    onLogout() {
      this.getRouter().navTo("RouteLoginPage");
    },

    MI_onPressButtons(oEvent) {
      const actionText = oEvent.getSource().getText();
      const i18n = this.getView().getModel("i18n").getResourceBundle();

      const dialogTexts = {
        "Approve": "confirmApprove",
        "Reject": "confirmRejectleave",
        "Send Back": "confirmReSend",
        "Paid": "confirmPaid"
      };

      this.getText = actionText;
      this.functionToOpenDialog(actionText, i18n.getText(dialogTexts[actionText]));
    },

    MI_onSearch: async function () {
      try {
        this.getBusyDialog();
        const filterItems = this.byId("MI_id_FilterBar").getFilterGroupItems();
        var params = {};
        const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });

        filterItems.forEach(oItem => {
          const oControl = oItem.getControl();
          const sKey = oItem.getName();

          if (oControl && typeof oControl.getValue === "function") {
            const sValue = oControl.getValue().trim();

            if (sKey === "SubmittedDate" && sValue) {
              const [startDate, endDate] = sValue.split('-').map(date => new Date(date));
              params["SubStartDate"] = oDateFormat.format(startDate);
              params["SubEndDate"] = oDateFormat.format(endDate);
            } else if (sKey === "Type" && oControl.getSelectedKeys().length > 0) {
              params[sKey] = oControl.getSelectedKeys()[0]; // assuming single selection
            } else if (sValue) {
              params[sKey] = sValue;
            }
          }
        });

        if (this.oLoginModel.Role !== "Account Manager" && this.oLoginModel.Role !== "Account Consultant") params["ManagerID"] = this.idEmp;
        else {
          if (!params.hasOwnProperty("Status")) {
            params["Status"] = "Send to account";
          }
        }
        await this._fetchCommonData("InboxDetails", "MyInboxModelData", params);
        this.onBeforeShow();
        this.closeBusyDialog();
      } catch (error) {
        this.closeBusyDialog();
        sap.m.MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
      }
    },

    MI_onClearEmployeeDetails() {
      ["EmpID", "Type", "SubmittedDate", "Status"].forEach(id =>
        this.byId(`MI_id_${id}Filter`).setValue("")
      );
      this.byId("MI_id_TypeFilter").removeAllSelectedItems();
    },

    functionToOpenDialog(text, oDialogTitle) {
      const oView = this.getView();
      if (!this.oDialog) {
        sap.ui.core.Fragment.load({
          name: "sap.kt.com.minihrsolution.fragment.ManagerRemarks",
          controller: this
        }).then(oDialog => {
          this.oDialog = oDialog;
          oView.addDependent(oDialog);
          oDialog.open();
          this.valueSetFunction(text, oDialogTitle);
        });
      } else {
        this.oDialog.open();
        this.valueSetFunction(text, oDialogTitle);
      }
    },

    MIF_onPressClose() {
      this.oDialog.close();
      this.onBeforeShow();
    },

    valueSetFunction(text, oDialogTitle) {
      sap.ui.getCore().byId("MIF_id_OkBtn").setText(text);
      var isAccount = this.oLoginModel.Role === "Account Manager" || this.oLoginModel.Role === "Account Consultant"
      var oValue = isAccount ? this.oModelData?.AccountRemark : this.oModelData?.ManagerComment;
      sap.ui.getCore().byId("MIF_id_remark").setValue(oValue || "");
      sap.ui.getCore().byId("MIF_id_DialogManRemark").setTitle(oDialogTitle);
    },

    onSelectionChangeStatus() {
      this.oModelData = this.byId("MI_id_MyInboxTable").getSelectedItem().getBindingContext("MyInboxModelData").getObject();
      const role = this.oLoginModel.Role;
      const { Status, Type } = this.oModelData;

      const isSubmitted = Status === "Submitted";
      const isAccountant = role === "Account Manager" || role === "Account Consultant";
      const isExpense = Type === "Expense";

      this.byId("MI_id_ButApprove").setVisible(isSubmitted && !isAccountant);
      this.byId("MI_id_ButReject").setVisible(isSubmitted && !isAccountant);
      this.byId("MI_id_ButReSend").setVisible((isExpense && isSubmitted && !isAccountant) || (isAccountant && Status === "Send to account"));
      this.byId("MI_id_ButPaid").setVisible(isAccountant && Status === "Send to account");
    },

    MI_onPressColNavigation(oEvent) {
      const oData = oEvent.getSource().getBindingContext("MyInboxModelData").getObject();

      if (oData.Type === "Expense") {
        this.getRouter().navTo("RouteExpensDetails", {
          sPath: oData.ID + "|MyInbox"
        });
      } else if (oData.Type === "Leave") {
        oData.StartDate = this.Formatter.formatDate(oData.StartDate);
        oData.EndDate = this.Formatter.formatDate(oData.EndDate);
        oData.SubmittedDate = this.Formatter.formatDate(oData.SubmittedDate);
        this.getOwnerComponent().setModel(new JSONModel(oData), "oNavLeaveModel");
        this.getRouter().navTo("RouteDetailLeave");
      } else {
        this.getRouter().navTo("SelfService", { sPath: oData.EmpID,Role: "MyInboxResignation" });
      }
    },

    MTF_onPressOk() {
      const btnText = sap.ui.getCore().byId("MIF_id_OkBtn").getText();
      const i18n = this.getView().getModel("i18n").getResourceBundle();

      const mapStatus = {
        "Approve": this.oModelData.Type === "Expense" ? "Send to account" : "Approved",
        "Reject": "Rejected",
        "Send Back": this.oLoginModel.Role === "Account Manager" || this.oLoginModel.Role === "Account Consultant" ? "Send back by account" : "Send back by manager",
        "Paid": "Paid"
      };

      const successKey = {
        "Approve": "approveMessageSuccess",
        "Reject": "rejectMessageSuccess",
        "Send Back": "resendMessageSuccess",
        "Paid": "PaidMessageSuccess"
      };

      const errorKey = {
        "Approve": "erroApproveMessage",
        "Reject": "errorRejectMessage",
        "Send Back": "errorResendMessage",
        "Paid": "errorPaidMessage"
      };

      if (this.MIF_liveChangeForMangerComments()) {
        const statusValue = mapStatus[btnText];
        this.updateCallForMyInboxFunction(this.oModelData, statusValue, successKey[btnText], errorKey[btnText]);
      } else {
        sap.m.MessageToast.show(i18n.getText("enterComments"));
      }
    },

    MIF_liveChangeForMangerComments() {
      const input = sap.ui.getCore().byId("MIF_id_remark");
      const regex = /^[^\\'"]*$/;

      if (!regex.test(input.getValue())) {
        input.setValueStateText(this.getView().getModel('i18n').getResourceBundle().getText("commentsValidation"));
        input.setValueState("Error");
        return false;
      }
      input.setValueState("None");
      return true;
    },

    updateCallForMyInboxFunction(oModelData, statusValue, successMsg, errorMsg) {
      const remark = sap.ui.getCore().byId("MIF_id_remark").getValue();
      oModelData.Status = statusValue;
      oModelData.NoofDays = String(oModelData.NoofDays);
      if (this.oLoginModel.Role === "Account Manager" || this.oLoginModel.Role === "Account Consultant") {
        oModelData.AccountRemark = remark;
      } else {
        oModelData.ManagerComment = remark;
      }
      this.oDialog.close();
      this.getBusyDialog();
      const requestData = { filters: { ID: oModelData.ID }, data: oModelData };
      this.ajaxUpdateWithJQuery("InboxDetails", requestData)
        .then(() => {
          this.MI_onSearch()
          this.closeBusyDialog();
          this.onBeforeShow();
          sap.m.MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText(successMsg));
        })
        .catch(() => {
          this.closeBusyDialog();
          sap.m.MessageBox.error(this.getView().getModel("i18n").getResourceBundle().getText(errorMsg));
        });
    },
    onBeforeShow() {
      const oTable = this.byId("MI_id_MyInboxTable");
      if (oTable && oTable.removeSelections) {
        oTable.removeSelections(); // Works only if selectionMode is enabled
      }
      ["MI_id_ButApprove", "MI_id_ButReject", "MI_id_ButReSend", "MI_id_ButPaid"].forEach(id => {
        const btn = this.byId(id);
        if (btn) btn.setVisible(false);
      });
    }
  });
});
