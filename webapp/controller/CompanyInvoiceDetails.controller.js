sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
     "../utils/validation"
],
    function (BaseController, JSONModel, MessageToast, Filter, FilterOperator, MessagePopover, MessageItem) {
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
            CI_onPressback: function () {
                this.getRouter().navTo("RouteCompanyInvoice", { sPath: "Company" });
            },
            validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
        });
    });