sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
     "../utils/validation"
],
    function (BaseController, JSONModel, MessageToast,utils) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.CompanyInvoiceDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteCompanyInvoiceDetails").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: function (oEvent) {
                var sArg = oEvent.getParameter("arguments").sPath;
                this.decodedPath = decodeURIComponent(decodeURIComponent(sArg));
                var selectedCustomerModel = new JSONModel({
                    CustomerName: "",
                    InvNo: "",
                    InvoiceDate: new Date(),
                    Name: "",
                    PAN: "",
                    GST: "",
                    Address: "",
                    MailID: "",
                    MobileNo: "",
                    SOWDetails: "",
                    Type: "",
                    InvoiceDescription: "",
                    Currency: "INR",
                    PayByDate: new Date(),
                    POSOW: "",
                    Status: "Submitted",
                    SubTotalNotGST: "0",
                    SubTotalInGST: "0",
                    LUT: ""
                });
                this.getView().setModel(selectedCustomerModel, "SelectedCustomerModel")
                var oFilteredSOWModel = new JSONModel({
                    results: [],
                    InvNo: this.newID,
                    IndexNo: "",
                    ItemID: "",
                    Particulars: "",
                    SAC: "",
                    Rate: "",
                    Currency: "INR",
                    Total: "",
                    gstAmount: "",
                    TotalAmount: "",
                    subTotal: "",
                });
                this.getView().setModel(oFilteredSOWModel, "FilteredSOWModel");
                var visiablityPlay = new JSONModel({ createVisi: true, editVisi: false, editable: true, igstVisi: false, gstVisiable: false, flexVisiable: false, CInvoice: false, addInvBtn: true, merge: false, GST: true, payByDate: false, Form: true, Table: false, MultiEmail: true, Edit: true, TDS: true });
                this.getView().setModel(visiablityPlay, "visiablityPlay");
            },
            
            CID_onPressback: function () {
                this.getRouter().navTo("RouteCompanyInvoice", { sPath: "Company" });
            },

            CID_ValidateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },

            CID_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            
             //Save the Data
             CID_onPressSubmit: function (oEvent) {
            try {
                if (utils._LCvalidateMandatoryField(this.byId("CID_id_AddCustComboBox"), "ID") && utils._LCvalidateMandatoryField(this.byId("CID_id_InvoiceDesc"), "ID") && utils._LCvalidateMandatoryField(this.byId("CID_id_SowPO"), "ID") && utils._LCvalidateMandatoryField(this.byId("CID_id_TDS"), "ID") && utils._LCvalidateMandatoryField(this.byId("CID_id_SowDetails"), "ID") && utils._LCvalidateMandatoryField(this.byId("CID_id_CurrencySelect"), "ID") && utils._LCvalidateDate(this.byId("CID_id_Invoice"), "ID") && utils._LCvalidateDate(this.byId("CID_id_Payby"), "ID")) {
                }
                else {
                    sap.m.MessageToast.show("Make sure all the mandatory fields are filled and validate the entered value");
                }
            }
            catch {
                sap.m.MessageToast.show("Technical error please connect to administrator");
            }
        }
        });
    });