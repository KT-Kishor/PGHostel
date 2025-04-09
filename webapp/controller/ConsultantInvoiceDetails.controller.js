sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation"
  ],
  function (
    BaseController,JSONModel,MessageToast,utils
  ) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.ConsultantInvoiceDetails",
      {
        onInit: function () {
          this.getRouter().getRoute("RouteNavConsultantInvoiceApplication").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
          this._makeDatePickersReadOnly(["CI_id_InDate", "CI_id_PaybyInv"]);
          this.i18nModelMess = this.getView().getModel('i18n').getResourceBundle();
          var sPath = oEvent.getParameter("arguments").sPath;
          var oPath = oEvent.getParameter("arguments").oPath;
          this.decodedPath = decodeURIComponent(decodeURIComponent(sPath));
          this.decodedEmployeeID = decodeURIComponent(oPath);
          this.Discount = true;
          this.UnitAmount = true;
          var oInvoiceModel = new JSONModel({
            EmployeeID: "", ConsultantName: "", InvoiceTo: "", InvoiceAddress: "",
            InvoiceNo: "", InvoiceDate: "", ConsultantAddress: "", GSTNO: "",
            CompanyGSTNO: "", MobileNo: "", CGST: false, SGST: false, IGST: false,
            BankName: "", AccountName: "", AccountNo: "", IFSCCode: "", PayBy: "",
            GSTValid: false, CGSTSelected: false, IGSTSelected: false, Percentage: "", Currency: "INR", Attachment: "", name: "", mimeType: ""});
            this.getView().setModel(oInvoiceModel, "ConsultantInvoiceModel");

          var oInvoiceItemModel = new JSONModel({
            SlNo: "", EmployeeID: "", Item: "", Days: "", SAC: "", UnitPrice: "", Total: "", SubTotal: "", TotalSum: "",Currency: "INR"});
            this.getView().setModel(oInvoiceItemModel, "oModelDataPro");

          var visibilityPlay = new JSONModel({createVisi: true, editVisi: false,editable: true,invBtn: true,pasteBtn: true, merge: false});
          this.getView().setModel(visibilityPlay, "visiablityPlay");
        },

        CID_ValidateDate: function (oEvent) {
          utils._LCvalidateDate(oEvent);
        },

        CID_ValidateGstNumber: function (oEvent) {
          utils._LCvalidateGstNumber(oEvent);
        },

        CID_ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        CID_ValidateMobileNo: function (oEvent) {
          utils._LCvalidateMobileNumber(oEvent);
        },

        CID_ValidateAccountNo: function (oEvent) {
          utils._LCvalidateAccountNo(oEvent);
        },

        CID_ValidateIfscCode: function (oEvent) {
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
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
              }
          } catch (error) {
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
          }
       },
      }
    );
  }
);
