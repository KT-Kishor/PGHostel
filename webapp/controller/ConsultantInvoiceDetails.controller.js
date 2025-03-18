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
    BaseController,JSONModel,MessageToast,Filter,FilterOperator,MessagePopover,MessageItem,utils
  ) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.ConsultantInvoiceDetails",
      {
        onInit: function () {
          this.getRouter().getRoute("RouteNavConsultantInvoiceApplication").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function (oEvent) {
          var sPath = oEvent.getParameter("arguments").sPath;
          var oPath = oEvent.getParameter("arguments").oPath;
          this.decodedPath = decodeURIComponent(decodeURIComponent(sPath));
          this.decodedEmployeeID = decodeURIComponent(oPath);
          var oInvoiceModel = new sap.ui.model.json.JSONModel({
            EmployeeID: "",
            ConsultantName: "",
            InvoiceTo: "",
            InvoiceAddress: "",
            InvoiceNo: "",
            InvoiceDate: "",
            ConsultantAddress: "",
            GSTNO: "",
            CompanyGSTNO: "",
            MobileNo: "",
            CGST: false,
            SGST: false,
            IGST: false,
            BankName: "",
            AccountName: "",
            AccountNo: "",
            IFSCCode: "",
            PayBy: "",
            GSTValid: false,
            CGSTSelected: false,
            IGSTSelected: false,
            Percentage: "",
            Currency: "INR",
            Attachment: "",
            name: "",
            mimeType: "",
          });
          this.getView().setModel(oInvoiceModel, "ConsultantInvoiceModel");

          var oInvoiceItemModel = new sap.ui.model.json.JSONModel({
            SlNo: "",
            EmployeeID: "",
            Item: "",
            Days: "",
            SAC: "",
            UnitPrice: "",
            Total: "",
            SubTotal: "",
            TotalSum: "",
            Currency: "INR",
          });
          this.getView().setModel(oInvoiceItemModel, "oModelDataPro");

          var visibilityPlay = new sap.ui.model.json.JSONModel({
            createVisi: true,
            editVisi: false,
            editable: true,
            invBtn: true,
            pasteBtn: true,
            merge: false,
          });
          this.getView().setModel(visibilityPlay, "visiablityPlay");
        },
        validateDate: function (oEvent) {
          utils._LCvalidateDate(oEvent);
        },
        validateGstNumber: function (oEvent) {
          utils._LCvalidateGstNumber(oEvent);
        },
        ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        validateMobileNo: function (oEvent) {
          utils._LCvalidateMobileNumber(oEvent);
        },
        validateAccountNo: function (oEvent) {
          utils._LCvalidateAccountNo(oEvent);
        },
        validateIfcCode: function (oEvent) {
          utils._LCvalidateIfcCode(oEvent);
        },
        CI_onPressback: function () {
          this.getRouter().navTo("RouteConsultantInvoiceApplication");
        },
        CI_onPressSubmit: function (oEvent) {
          try {
              if (
                  utils._LCvalidateDate(this.byId("CI_id_InDate"), "ID") &&
                  utils._LCvalidateDate(this.byId("CI_id_PaybyInv"), "ID") &&
                  utils._LCvalidateMandatoryField(this.byId("CI_id_InputInvoiceTo"), "ID") &&
                  utils._LCvalidateMandatoryField(this.byId("CI_id_InputInvoiceAddress"), "ID") &&
                  utils._LCvalidateGstNumber(this.byId("CI_id_InputCompGSTNO"), "ID") &&
                  utils._LCvalidateMandatoryField(this.byId("CI_id_ConsultantName"), "ID") &&
                  utils._LCvalidateMobileNumber(this.byId("CI_id_InputMobile"), "ID") &&
                  utils._LCvalidateMandatoryField(this.byId("CI_id_InputConsultantAddress"), "ID") &&
                  utils._LCvalidateGstNumber(this.byId("CI_id_InputGSTNO"), "ID") &&
                  utils._LCvalidateMandatoryField(this.byId("CI_id_InputBankName"), "ID") &&
                  utils._LCvalidateMandatoryField(this.byId("CI_id_InputAccountName"), "ID") &&
                  utils._LCvalidateAccountNo(this.byId("CI_id_InputAccountNo"), "ID") &&
                  utils._LCvalidateIfcCode(this.byId("CI_id_InputIFSCCode"), "ID")) {
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
