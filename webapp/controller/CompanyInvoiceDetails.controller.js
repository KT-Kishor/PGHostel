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

            _onRouteMatched:async function (oEvent) {
                var LoginFUnction = await this.commonLoginFunction("CompanyInvoice");
                if (!LoginFUnction) return;
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
                this.getView().setModel(selectedCustomerModel, "SelectedCustomerModel");
                this.SelectedCustomerModel = this.getView().getModel("SelectedCustomerModel");
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

            CID_ValidateCommonFields:async function(oEvent){
                utils._LCvalidateMandatoryField(oEvent);
                this.getBusyDialog();
                this.SelectKey = oEvent.getSource().getSelectedKey();
                var SelectedData = this.getView().getModel("ManageCustomerModel").getData().filter((item) => item.ID === this.SelectKey)[0];
                this.SelectedCustomerModel.setProperty("/Name", SelectedData.name);
                this.SelectedCustomerModel.setProperty("/PAN", SelectedData.PAN);
                this.SelectedCustomerModel.setProperty("/GST", SelectedData.GST);
                this.SelectedCustomerModel.setProperty("/Address", SelectedData.address);
                this.SelectedCustomerModel.setProperty("/MailID", SelectedData.mailID);
                this.SelectedCustomerModel.setProperty("/MobileNo", SelectedData.mobileNo);
                await this.ajaxCreateWithJQuery("combineSowMsa", {MsaID:this.SelectKey}).then((oData) => {
                        if (oData.success) {
                            var oJson = new JSONModel({ items: oData.combinedData });
                            this.getView().setModel(oJson,"CombinedData");
                           this.closeBusyDialog();
                        }
                    }).catch((error) => {
                        this.closeBusyDialog();
                        MessageToast.show(error.responseText);
                    });
            },
            
            CID_onPressback: function () {
                this.getRouter().navTo("RouteCompanyInvoice", { sPath: "Company" });
            },

            CID_ValidateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
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