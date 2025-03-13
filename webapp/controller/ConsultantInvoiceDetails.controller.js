sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem"

],
    function (BaseController, JSONModel, MessageToast, Filter, FilterOperator, MessagePopover, MessageItem) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ConsultantInvoiceDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteNavConsultantInvoiceApplication").attachMatched(this._onRouteMatched, this);
              },
              _onRouteMatched: function (oEvent) {
                // this.selectedContractID = null;
                // this.commonLoginFunction("ConsultantInvoice");
                // this.commonInvoiceSACFunction();
                // this.LogoFunction();
                // this.CommanCompanyEmailFunction("ContractApp");
                // this.i18nModelMess = this.getView().getModel('i18n').getResourceBundle();
                // var aDatePickerIds = ["idInDate", "idPaybyInv"];
                // this._makeDatePickersReadOnly(aDatePickerIds);
                var sPath = oEvent.getParameter("arguments").sPath;
                var oPath = oEvent.getParameter("arguments").oPath;
                this.decodedPath = decodeURIComponent(decodeURIComponent(sPath));
                this.decodedEmployeeID = decodeURIComponent(oPath);
                this.oModel = this.getOwnerComponent().getModel();
                this.Discount = true;
                this.UnitAmount = true;
                // this.getView().getModel("loginModel").setProperty("/sendEmail", false);
                // this.getView().getModel("loginModel").setProperty("/sendEmailForm", true);
        
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
                  Currency: "INR"
                });
                this.getView().setModel(oInvoiceItemModel, "oModelDataPro");
        
                var visibilityPlay = new sap.ui.model.json.JSONModel({ createVisi: true, editVisi: false, editable: true, invBtn: true, pasteBtn: true, merge: false, });
                this.getView().setModel(visibilityPlay, "visiablityPlay");
        
                // // Get user type from the login model
                // var sUserType = this.getView().getModel("loginModel").getProperty("/Type");
        
                // // Control visibility of ComboBox based on user type and whether we are in create or edit mode
                // var oComboBox = this.getView().byId("idCont");
        
                // // Check if we're in edit mode: If sPath or oPath has specific values indicating edit mode
                // var isEditMode = sPath !== "X" && oPath !== "Y"; // Modify this check if your edit condition is different
        
                // // If the user is "Admin" and not in edit mode, show the ComboBox, else hide it
                // if (sUserType === "Admin" && !isEditMode) {
                //   oComboBox.setVisible(true); // Show ComboBox if Admin and not in edit mode
                // } else {
                //   oComboBox.setVisible(false); // Hide ComboBox in edit mode or if not Admin
                // }
        
                // if (sPath === "X" && oPath === "Y") {
                //   this.readFunction("/ConsultantInvoice", "ConsultantInvoiceModel", true);
                //   this.readFunction("/ConsultantInvoiceItem", "oModelDataPro", true);
                //   this.byId("idTable").setMode("Delete");
                //   this.byId("idSmartTableConsultantInvoiceItem").setModel(oInvoiceItemModel);
                // } else {
                //   this.fetchInvoiceData(this.decodedPath, this.decodedEmployeeID);
                //   this.fetchInvoiceItems(this.decodedPath, this.decodedEmployeeID);
                //   this.setVisibilityForEdit();
                // }
                // this.commonCurrencyFunction();
                // this.scrollToSection("idNavConsultantInvoicePage", "idFirstSection");
        
                var oComboBox = this.getView().byId("idCont");
                oComboBox.setSelectedKey("");
              },
        });
    });