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
            },
        });
    });