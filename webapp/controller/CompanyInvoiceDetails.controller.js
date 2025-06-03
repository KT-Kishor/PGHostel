sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation"
],
    function (BaseController, JSONModel, MessageToast, utils) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.CompanyInvoiceDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteCompanyInvoiceDetails").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                var sArg = oEvent.getParameter("arguments").sPath;
                if (!(await this.commonLoginFunction("CompanyInvoice"))) return;

                if (!this.getView().getModel("CurrencyModel")) {
                    this._fetchCommonData("Currency", "CurrencyModel");
                }
                this._makeDatePickersReadOnly(["CID_id_Invoice", "CID_id_Payby", "CID_id_NavInvoice", "CID_id_NavPayby", "CI_Id_Status", "CID_id_CurrencySelect"]);

                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.decodedPath = decodeURIComponent(decodeURIComponent(sArg));
                this.Amount = true;

                const oView = this.getView();

                oView.setModel(new JSONModel({
                    CustomerName: "", InvNo: "", InvoiceDate: new Date(), Name: "", PAN: "", GST: "", Address: "", MailID: "", MobileNo: "",
                    SOWDetails: "", Type: "", InvoiceDescription: "", Currency: "INR", PayByDate: new Date(), POSOW: "", Status: "Submitted",
                    SubTotalNotGST: "0", SubTotalInGST: "0", LUT: ""
                }), "SelectedCustomerModel");

                this.SelectedCustomerModel = oView.getModel("SelectedCustomerModel");

                oView.setModel(new JSONModel({
                    results: [], InvNo: this.newID, IndexNo: "", ItemID: "", Particulars: "", SAC: "", Rate: "", Currency: "INR",
                    Total: "", gstAmount: "", TotalAmount: "", subTotal: ""
                }), "FilteredSOWModel");

                oView.setModel(new JSONModel({
                    createVisi: true, editVisi: false, editable: true, igstVisi: false, gstVisiable: false,
                    flexVisiable: false, CInvoice: false, addInvBtn: true, merge: false, GST: true, payByDate: false,
                    Form: true, Table: false, MultiEmail: true, Edit: true, IncomeTax: true
                }), "visiablityPlay");

                this.visiablityPlay = oView.getModel("visiablityPlay");

                oView.setModel(new JSONModel(), "CompanyInvoiceItemModel");
                this.Update = false;
                if (sArg === "X") return;

                this.visiablityPlay.setProperty("/flexVisiable", true);
                this.visiablityPlay.setProperty("/createVisi", false);
                this.visiablityPlay.setProperty("/editVisi", true);
                this.visiablityPlay.setProperty("/editable", false);
                this.visiablityPlay.setProperty("/addInvBtn", false);
                this.byId("CID_id_TableInvoiceItem").setMode("None");
                this.byId("CID_id_CurrencySelect").setEditable(false);

                this.getBusyDialog();

                try {
                    const oData = await this.ajaxReadWithJQuery("CompanyInvoiceItem", { InvNo: this.decodedPath });
                    this.Update = true;
                    if (!oData.success) throw new Error("Invalid data structure");

                    var oHeader = oData.data.CompanyInvoice?.[0] || {};
                    oHeader.InvoiceDate = this.Formatter.formatDate(oHeader.InvoiceDate);
                    this.SelectedCustomerModel.setData(oHeader);

                    const aItems = oData.data.CompanyInvoiceItem.map((item, index) => ({ ...item, IndexNo: index + 1 }));
                    oView.setModel(new JSONModel({ CompanyInvoiceItem: aItems }), "CompanyInvoiceItemModel");

                    const { IGST = "0", SGST = "0", CGST = "0", Value, Currency, PayByDate, Status, InvNo } = oHeader;
                    if (IGST === "0") {
                        this.visiablityPlay.setProperty("/igstVisi", false);
                        this.visiablityPlay.setProperty("/gstVisiable", true);
                    } else {
                        this.visiablityPlay.setProperty("/igstVisi", true);
                        this.visiablityPlay.setProperty("/gstVisiable", false);
                    }

                    if (IGST === "0" && SGST === "0" && CGST === "0") {
                        this.visiablityPlay.setProperty("/igstVisi", false);
                        this.visiablityPlay.setProperty("/gstVisiable", false);
                    }

                    if (Value == null) {
                        this.visiablityPlay.setProperty("/igstVisi", false);
                        this.visiablityPlay.setProperty("/gstVisiable", false);
                    }

                    if (Currency !== "INR") {
                        this.visiablityPlay.setProperty("/GST", false);
                        this.byId("idSAC")?.setVisible(false);
                        this.byId("idGSTCalculation")?.setVisible(false);
                        this.visiablityPlay.setProperty("/TDS", false);
                    } else {
                        this.visiablityPlay.setProperty("/GST", true);
                        this.byId("idSAC")?.setVisible(true);
                        this.byId("idGSTCalculation")?.setVisible(true);
                        this.visiablityPlay.setProperty("/TDS", true);
                    }

                    if (PayByDate) {
                        const payByDate = new Date(PayByDate);
                        const today = new Date();
                        const daysDiff = Math.ceil((payByDate - today) / (1000 * 60 * 60 * 24));
                        const showReminder = daysDiff <= 10;
                        this.visiablityPlay.setProperty("/payByDate", showReminder);
                        this.ReminderEmail = showReminder;
                    }

                    if (Status === "Payment Received") {
                        this.visiablityPlay.setProperty("/payByDate", false);
                        this.visiablityPlay.setProperty("/createVisi", false);
                        this.visiablityPlay.setProperty("/Edit", false);
                        this.visiablityPlay.setProperty("/MultiEmail", false);
                    }
                    this.Status = Status;
                    this.totalAmountCalculation();
                    this.Readcall("InvoicePaymentDetail", {InvNo:this.decodedPath})
                } catch (error) {
                    MessageToast.show(error.responseText || "Failed to load invoice data.");
                } finally {
                    this.closeBusyDialog();
                }
            },

            CID_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            onChangeAddCustomer: async function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                this.SelectKey = oEvent.getSource().getSelectedKey();
                var SelectedData = this.getView().getModel("ManageCustomerModel").getData().filter((item) => item.ID === this.SelectKey)[0];
                if (!SelectedData) return;
                this.getBusyDialog();
                this.SelectedCustomerModel.setProperty("/Name", SelectedData.name);
                this.SelectedCustomerModel.setProperty("/PAN", SelectedData.PAN);
                this.SelectedCustomerModel.setProperty("/GST", SelectedData.GST);
                this.SelectedCustomerModel.setProperty("/Address", SelectedData.address);
                this.SelectedCustomerModel.setProperty("/MailID", SelectedData.mailID);
                this.SelectedCustomerModel.setProperty("/MobileNo", SelectedData.mobileNo);
                this.SelectedCustomerModel.setProperty("/Type", SelectedData.type);
                this.SelectedCustomerModel.setProperty("/Value", SelectedData.value);
                this.getView().getModel("CompanyInvoiceItemModel").setProperty("/CompanyInvoiceItem", []);
                this.byId("CID_id_SowDetails").setValue("").setSelectedKey("")
                this.SelectedCustomerModel.refresh(true)
                await this.ajaxCreateWithJQuery("combineSowMsa", { MsaID: this.SelectKey }).then((oData) => {
                    if (oData.success) {
                        var oJson = new JSONModel({ items: oData.combinedData });
                        this.getView().setModel(oJson, "CombinedData");
                        this.closeBusyDialog();
                        this.onChangeInvoiceDate();
                    }
                }).catch((error) => {
                    this.closeBusyDialog();
                    MessageToast.show(error.responseText);
                });
            },

            onChangeInvoiceDate: async function () {
                const oData = await this.ajaxReadWithJQuery("MSADetails", { MsaID: this.SelectKey });
                const oSelectedCustomerModel = this.getView().getModel("SelectedCustomerModel");
                if (oData.success) {
                    var paymentDateObj = new Date(oSelectedCustomerModel.getData().InvoiceDate);
                    var paymentDay = parseInt(oData.data[0].ContractPeriod);
                    paymentDateObj.setDate(paymentDateObj.getDate() + paymentDay);
                    oSelectedCustomerModel.setProperty("/PayByDate", paymentDateObj);
                } else {
                    var currentDate = new Date();
                    currentDate.setDate(currentDate.getDate() + 30);
                    oSelectedCustomerModel.setProperty("/PayByDate", currentDate);
                }
            },

            OnChangeSowDetails: async function (oEvent) {
                const sSelectedKey = oEvent.getSource().getSelectedKey();
                const oView = this.getView();
                const oSelectedCustomerModel = oView.getModel("SelectedCustomerModel");
                const oFilteredSOWModel = oView.getModel("FilteredSOWModel");

                const resetFields = () => {
                    oFilteredSOWModel.setProperty("/Currency", "INR");
                    this.byId("idSAC").setVisible(true);
                    this.byId("idGSTCalculation").setVisible(true);
                    oSelectedCustomerModel.setProperty("/POSOW", "");
                    this.byId("idCurrencySelect").setEditable(true);
                    oFilteredSOWModel.setProperty("/gstAmount", "0");
                    oFilteredSOWModel.setProperty("/TotalAmount", "0");
                    oSelectedCustomerModel.setProperty("/SubTotalInGST", "0");
                    oSelectedCustomerModel.setProperty("/SubTotalNotGST", "0");
                };
                if (sSelectedKey === ' - ') { resetFields(); return; }
                this.getBusyDialog();
                try {
                    const [msaID, sowID] = sSelectedKey.split(' - ');
                    const oData = await this.ajaxReadWithJQuery("SowDetails", { MsaID: msaID, SowID: sowID, Status: "Active" });

                    if (!oData.success) return;

                    const unitMultiplier = { Day: 20, Month: 1, Hour: 168 };
                    let aFilteredSOWDetails = [];
                    this.itemIDCounter = 1;

                    oData.data.forEach((oSOW) => {
                        if (oSOW.MsaID !== msaID) return;

                        const [rateValue, currency, a, b, unit] = oSOW.Rate.split(" ");
                        const multiplier = unitMultiplier[unit] || 0;
                        const total = parseFloat(rateValue) * multiplier;

                        aFilteredSOWDetails.push({
                            ...oSOW,
                            IndexNo: this.itemIDCounter++,
                            ItemID: globalThis.crypto.randomUUID(),
                            InvNo: this.newID,
                            Particulars: oSOW.ConsultantName,
                            SAC: "998314",
                            GSTCalculation: (currency === "INR") ? "YES" : "",
                            Unit: multiplier,
                            Rate: rateValue,
                            Currency: currency,
                            Discount: "",
                            Total: total
                        });
                    });

                    oFilteredSOWModel.setProperty("/Currency", aFilteredSOWDetails[0]?.Currency || "INR");

                    this.getView().getModel("CompanyInvoiceItemModel").setProperty("/CompanyInvoiceItem", aFilteredSOWDetails);
                    this.visiablityPlay.setProperty("/flexVisiable", true);
                    this.byId("CID_id_CurrencySelect").setEditable(false);
                    oSelectedCustomerModel.setProperty("/POSOW", "SOW");

                    const isINR = oFilteredSOWModel.getProperty("/Currency") === "INR";
                    this.byId("idSAC").setVisible(isINR);
                    this.byId("idGSTCalculation").setVisible(isINR);
                    this.visiablityPlay.setProperty("/IncomeTax", isINR);
                    this.visiablityPlay.setProperty("/GST", isINR);
                    oSelectedCustomerModel.setProperty("/type", isINR ? this.Type : "");

                    if (!oSelectedCustomerModel.getProperty("/GST")) {
                        this.visiablityPlay.setProperty("/GST", false);
                    }
                    await this.totalAmountCalculation();
                    if (isINR) {
                        const subTotal = parseFloat(oSelectedCustomerModel.getProperty("/SubTotalInGST")) || 0;
                        oSelectedCustomerModel.setProperty("/IncomeTax", ((subTotal * 10) / 100).toFixed(2));
                    }
                } catch (error) {
                    MessageToast.show(error.responseText);
                } finally {
                    this.closeBusyDialog();
                }
            },

            CID_onPressAddInvoiceItems: function () {
                const oView = this.getView();
                const oItemModel = oView.getModel("CompanyInvoiceItemModel");
                let oData = oItemModel.getProperty("/CompanyInvoiceItem") || [];
                // Generate new invoice item
                const currency = this.byId("CID_id_CurrencySelect").getValue();
                const newItem = {
                    IndexNo: oData.length ? oData[oData.length - 1].IndexNo + 1 : 1,
                    Particulars: "",
                    SAC: "998314",
                    GSTCalculation: (currency === "INR") ? "YES" : "",
                    Unit: "",
                    Rate: "",
                    Currency: currency,
                    Discount: "",
                    Total: "",
                };
                if (this.Update) {
                    newItem.flag = "create";
                }
                // Add and update model
                oData.push(newItem);
                oItemModel.setProperty("/CompanyInvoiceItem", oData);
            },

            totalAmountCalculation: function () {
                const oView = this.getView();
                const oSOWModel = oView.getModel("FilteredSOWModel");
                const oInvoiceModel = oView.getModel("CompanyInvoiceItemModel");
                const oCustomerModel = oView.getModel("SelectedCustomerModel");
                let aSOWDetails = oInvoiceModel.getProperty("/CompanyInvoiceItem") || [];
                let totalWithGST = 0;
                let totalWithoutGST = 0;
                aSOWDetails.forEach((item) => {
                    const rate = parseFloat(item.Rate) || 0;
                    const unit = parseFloat(item.Unit) || 0;
                    const baseAmount = unit ? unit * rate : rate;

                    let discountAmount = 0;
                    if (typeof item.Discount === "string" && item.Discount.trim().endsWith("%")) {
                        const percent = parseFloat(item.Discount) / 100;
                        discountAmount = baseAmount * percent;
                        item.Discount = discountAmount.toFixed(2);
                    } else {
                        discountAmount = parseFloat(item.Discount) || 0;
                    }
                    const finalAmount = baseAmount - discountAmount;
                    if(finalAmount < 0){
                        item.Total = '0.00';
                        item.Discount = unit * rate;
                    }else{
                        item.Total = finalAmount.toFixed(2);
                    }
                    const isGSTApplicable = item.GSTCalculation === "YES" && oCustomerModel.getProperty("/Currency") === "INR";
                    item.SAC = isGSTApplicable ? "998314" : "-";
                    isGSTApplicable ? totalWithGST += finalAmount : totalWithoutGST += finalAmount;
                });

                const subTotalGST = totalWithGST.toFixed(2);
                const subTotalNoGST = totalWithoutGST.toFixed(2);
                const subtotal = (totalWithGST + totalWithoutGST).toFixed(2);

                oCustomerModel.setProperty("/SubTotalInGST", subTotalGST);
                oCustomerModel.setProperty("/SubTotalNotGST", subTotalNoGST);
                oCustomerModel.setProperty("/AmountInINR", subTotalGST);
                oSOWModel.setProperty("/subTotal", subtotal);

                const type = oCustomerModel.getProperty("/Type");
                const taxRate = parseFloat(oCustomerModel.getProperty("/Value")) || 0;
                let gstAmount = 0, finalAmount = totalWithGST + totalWithoutGST;

                if (type === "CGST/SGST") {
                    gstAmount = (totalWithGST * taxRate) / 100;
                    finalAmount += gstAmount * 2;
                    oCustomerModel.setProperty("/CGST", gstAmount.toFixed(2));
                    oCustomerModel.setProperty("/SGST", gstAmount.toFixed(2));
                } else if (type === "IGST") {
                    gstAmount = (totalWithGST * taxRate) / 100;
                    finalAmount += gstAmount;
                    oCustomerModel.setProperty("/IGST", gstAmount.toFixed(2));
                }

                oSOWModel.setProperty("/gstAmount", gstAmount.toFixed(2));
                oSOWModel.setProperty("/TotalAmount", finalAmount.toFixed(2));
                oCustomerModel.setProperty("/TotalAmount", finalAmount.toFixed(2));

                this.onChangeConversionRate();
            },

            Comp_OnChangeDiscount: async function (oEvent) {
                await this.totalAmountCalculation();
                var oNavigationModel = this.getView().getModel("SelectedCustomerModel");
                if (oNavigationModel.getData().Currency === "INR") oNavigationModel.setProperty("/IncomeTax", parseInt((oNavigationModel.getData().SubTotalInGST * 10) / 100).toFixed(2));
            },

            Comp_onChangeGSTCalculation: function (oEvent) { this.totalAmountCalculation(); },

            onChangeConversionRate: function () {
                var oModel = this.getView().getModel("FilteredSOWModel").getData().subTotal;
                var value = this.getView().getModel("SelectedCustomerModel");
                var data = parseFloat(value.getData().ConversionRate) * parseFloat(oModel);
                value.setProperty("/AmountInFCurrency", parseFloat(data).toFixed(2));
            },

            onChangeSowDetailsCal: async function (oEvent) {
                const oInput = oEvent.getSource();
                const oRowContext = oInput.getBindingContext("CompanyInvoiceItemModel");
                if (!oRowContext) return;

                const oSOW = oRowContext.getObject();
                const rate = parseFloat(oSOW.Rate) || 0;
                const unit = parseFloat(oSOW.Unit) || 0;
                const discount = parseFloat(oSOW.Discount) || 0;

                let iTotal = unit ? rate * unit : rate;
                iTotal -= discount;

                const sTotalPath = oRowContext.getPath() + "/Total";
                oRowContext.getModel().setProperty(sTotalPath, isNaN(iTotal) ? 0 : iTotal.toFixed(2));

                this.visiablityPlay.setProperty("/flexVisiable", true);

                await this.totalAmountCalculation();

                const oNavigationModel = this.getView().getModel("SelectedCustomerModel");
                const oNavigationData = oNavigationModel.getData();

                if (oNavigationData.Currency === "INR") {
                    const subTotal = parseFloat(oNavigationData.SubTotalInGST) || 0;
                    const tds = ((subTotal * 10) / 100).toFixed(2);
                    oNavigationModel.setProperty("/IncomeTax", tds);
                }
            },

            CID_onPressAddCustomer: function () { this.getRouter().navTo("RouteManageCustomer", { value: "Data" }); },

            CID_onPressMSAandSOW: function () {
                if (this.SelectKey) {
                    this.getRouter().navTo("RouteMSAEdit", { sPath: this.SelectKey });
                } else {
                    this.getRouter().navTo("RouteMSA");
                }
            },

            CID_onPressback: function () { this.getRouter().navTo("RouteCompanyInvoice") },

            CID_ValidateDate: function (oEvent) { utils._LCvalidateDate(oEvent) },

            SubmitPayload: async function (sMode) {
                const oView = this.getView();
                const oSelectedCustomerModel = oView.getModel("SelectedCustomerModel").getData();
                const oCompanyInvoiceItemModel = oView.getModel("CompanyInvoiceItemModel").getData();

                const oModel = {
                    Currency: oSelectedCustomerModel.Currency,
                    subTotal: oSelectedCustomerModel.SubTotalInGST,
                    gstAmount: oSelectedCustomerModel.gstAmount,
                    TotalAmount: oSelectedCustomerModel.TotalAmount
                };

                const oPayload = {
                    InvoiceDate: (sMode === 'update') ? oSelectedCustomerModel.InvoiceDate.split('/').reverse().join('-') : oSelectedCustomerModel.InvoiceDate?.toISOString().split('T')[0] || "",
                    CustomerName: (sMode === 'update') ? oSelectedCustomerModel.CustomerName : oSelectedCustomerModel.Customer,
                    GST: String(oSelectedCustomerModel.GST) || "",
                    Address: String(oSelectedCustomerModel.Address),
                    PAN: String(oSelectedCustomerModel.PAN),
                    MobileNo: String(oSelectedCustomerModel.MobileNo),
                    AmountInFCurrency: oModel.Currency === "INR"
                        ? (!isNaN(oSelectedCustomerModel.AmountInFCurrency) ? oSelectedCustomerModel.AmountInFCurrency : "0")
                        : parseFloat(oModel.subTotal) || 0,
                    Currency: oModel.Currency,
                    ConversionRate: !isNaN(oSelectedCustomerModel.ConversionRate) ? parseFloat(oSelectedCustomerModel.ConversionRate) : 0,
                    AmountInINR: oModel.Currency === "INR"
                        ? parseFloat(oModel.subTotal) || 0
                        : parseFloat(oSelectedCustomerModel.AmountInFCurrency) || 0,
                    CGST: oSelectedCustomerModel.Type === "CGST/SGST" ? parseFloat(oModel.gstAmount) || 0 : 0,
                    SGST: oSelectedCustomerModel.Type === "CGST/SGST" ? parseFloat(oModel.gstAmount) || 0 : 0,
                    IGST: oSelectedCustomerModel.Type === "IGST" ? parseFloat(oModel.gstAmount) || 0 : 0,
                    TotalAmount: parseFloat(oModel.TotalAmount) || 0,
                    Status: oSelectedCustomerModel.Status,
                    InvoiceDescription: oSelectedCustomerModel.InvoiceDescription || "",
                    IncomeTax: oSelectedCustomerModel.IncomeTax,
                    MailID: oSelectedCustomerModel.MailID,
                    Type: oSelectedCustomerModel.Type || "",
                    Value: (!oSelectedCustomerModel.Value || isNaN(oSelectedCustomerModel.Value)) ? "0" : oSelectedCustomerModel.Value,
                    PayByDate: (sMode === 'update') ? oSelectedCustomerModel.PayByDate.split('/').reverse().join('-') : oSelectedCustomerModel.PayByDate?.toISOString().split('T')[0] || "",
                    POSOW: oSelectedCustomerModel.POSOW,
                    SubTotalNotGST: parseFloat(oSelectedCustomerModel.SubTotalNotGST) || 0,
                    SubTotalInGST: parseFloat(oSelectedCustomerModel.SubTotalInGST) || 0,
                    LUT: String(oSelectedCustomerModel.LUT)
                };
                const aItemsRaw = oCompanyInvoiceItemModel.CompanyInvoiceItem || [];
                const aItems = aItemsRaw.map(item => {
                    const itemData = {
                        InvNo: oSelectedCustomerModel.InvNo,
                        SAC: item.SAC,
                        Unit: item.Unit,
                        Particulars: item.Particulars,
                        Rate: item.Rate,
                        Total: item.Total,
                        Currency: item.Currency,
                        GSTCalculation: item.GSTCalculation,
                        Discount: item.Discount
                    };
                    if (sMode === "update") {
                        let filters;
                        if (item.flag === "create") {
                            filters = { flag: "create" };
                        } else {
                            filters = {
                                InvNo: oSelectedCustomerModel.InvNo,
                                ItemID: item.ItemID
                            };
                        }
                        return {
                            data: itemData,
                            filters: filters
                        };
                    } else {
                        return itemData;
                    }
                });
                const finalPayload = {
                    payload: oPayload
                };
                if (sMode === "update") {
                    finalPayload.filters = {
                        InvNo: oSelectedCustomerModel.InvNo,
                    };
                }
                finalPayload.items = aItems;
                return finalPayload;
            },

            CID_onPressSubmit: async function (oEvent) {
                try {
                    const bIsValid =
                        utils._LCvalidateMandatoryField(this.byId("CID_id_AddCustComboBox"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_InvoiceDesc"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_SowPO"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_TDS"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_SowDetails"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_CurrencySelect"), "ID")

                    if (!bIsValid) {
                        return MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                    }
                    this.getBusyDialog();
                    const oPayload = await this.SubmitPayload("Create");
                    try {
                        await this.ajaxCreateWithJQuery("CompanyInvoice", { data: oPayload.payload, Items: oPayload.items });
                        this.closeBusyDialog();
                        MessageToast.show("Data submitted successfully");
                    } catch (error) {
                        sap.m.MessageToast.show(error.responseText || "Submission failed");
                    }
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },

            CID_onPressEdit: function () {
                var isEditMode = this.visiablityPlay.getProperty("/editable");
                if (isEditMode) {
                    this.onPressUpdateInvoice();
                } else {
                    this.visiablityPlay.setProperty("/editable", true);
                    this.visiablityPlay.setProperty("/CInvoice", true);
                    this.byId("CID_id_TableInvoiceItem").setMode("Delete");
                    this.visiablityPlay.setProperty("/addInvBtn", true);
                    this.visiablityPlay.setProperty("/merge", false);
                    this.visiablityPlay.setProperty("/MultiEmail", false);
                    this.visiablityPlay.setProperty("/payByDate", false);
                }
            },
            CID_onPressLiveChangeEmail: function (oEvent) { utils._LCvalidateEmail(oEvent) },

            onPressUpdateInvoice: async function () {
                try {
                    const bIsValid =
                        utils._LCvalidateMandatoryField(this.byId("CID_id_InvoiceDesc"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_SowPO"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_TDS"), "ID") &&
                        utils._LCvalidateEmail(this.byId("CID_id_InputMailID"), "ID");

                    if (!bIsValid) {
                        return MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                    }

                    this.getBusyDialog();
                    const oPayload = await this.SubmitPayload("update");

                    try {
                        await this.ajaxUpdateWithJQuery("CompanyInvoice", { data: oPayload.payload, filtres: oPayload.filters, Items: oPayload.items });
                        MessageToast.show("Data submitted successfully");
                        this.visiablityPlay.setProperty("/editable", false);
                        this.visiablityPlay.setProperty("/CInvoice", false);
                        this.byId("CID_id_TableInvoiceItem").setMode("None");
                        this.visiablityPlay.setProperty("/addInvBtn", false);
                        this.visiablityPlay.setProperty("/merge", true);
                        this.visiablityPlay.setProperty("/MultiEmail", true);
                        this.visiablityPlay.setProperty("/payByDate", true);
                        this.closeBusyDialog();
                    } catch (error) {
                        this.closeBusyDialog();
                        MessageToast.show(error.responseText || "Submission failed");
                    }
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },

            onChangeInvoiceStatus: function (oEventOrStatus) {
                var that = this;
                var status = "";
                if (oEventOrStatus && typeof oEventOrStatus.getSource === "function") {
                    var oSource = oEventOrStatus.getSource();

                    if (typeof oSource.getValue === "function") {
                        status = oSource.getValue();
                        this.visiablityPlay.setProperty("/Form", true);
                        this.visiablityPlay.setProperty("/Table", false);
                    }
                }
                else if (typeof oEventOrStatus === "string") {
                    status = oEventOrStatus;
                    this.visiablityPlay.setProperty("/Form", false);
                    this.visiablityPlay.setProperty("/Table", true);
                }
                if (status === "Payment Received" || status === "Payment Partially" || status === "Open") {
                    var oView = that.getView();
                    if (!that.oDialog) {
                        that.oDialog = sap.ui.core.Fragment.load({
                            name: "sap.kt.com.minihrsolution.fragment.CompanyInvoice",
                            controller: that
                        }).then(function (oDialog) {
                            that.oDialog = oDialog;
                            oView.addDependent(that.oDialog);
                            that.oDialog.open();
                            that.modelFunction();
                            that.FragmentDatePickersReadOnly(["idReceivedDate"]);
                        }.bind(that));
                    } else {
                        that.oDialog.open();
                        that.modelFunction();
                        that.FragmentDatePickersReadOnly(["idReceivedDate"]);
                    }
                }
            },

            modelFunction: function () {
                var oNavigationModel = this.getView().getModel("SelectedCustomerModel").getData();
                var oModel = new JSONModel({
                    InvNo: oNavigationModel.InvNo,
                    TransactionId: "",
                    ReceivedDate: this.Formatter.formatDate(new Date()),
                    ReceivedAmount: "",
                    TotalAmount: oNavigationModel.TotalAmount,
                    DueAmount: (this.getView().getModel("InvoicePayment").getData().length !== 0) ? parseFloat(this.getView().getModel("InvoicePayment").getProperty("/AllDueAmount")) : parseFloat(oNavigationModel.TotalAmount) - parseFloat(oNavigationModel.IncomeTax),
                    Currency: oNavigationModel.Currency,
                    ReceivedTDS: (oNavigationModel.Currency === "INR") ? parseFloat(oNavigationModel.IncomeTax) - parseFloat(this.getView().getModel("InvoicePayment").getProperty("/AllReceivedTDS") || 0) : '0',
                    ConversionRate: "",
                    AmountInINR: ""
                });
                this.getView().setModel(oModel, "PaymentModel")
            },

            CID_onPressDisplayPaymentDetail: function () {
                this.onChangeInvoiceStatus("Open");
                this.visiablityPlay.setProperty("/Form", false);
                this.visiablityPlay.setProperty("/Table", true);
            },

            onChangeReceivedAmount: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
                var paymentModel = this.getView().getModel("PaymentModel");
                var allPaymentData = this.getView().getModel("InvoicePayment");

                var totalReceivedAmount = 0;
                if (allPaymentData) {
                    totalReceivedAmount = this.getView().getModel("InvoicePayment").getProperty("/AllReceivedAmount");
                }
                var totalAmount = parseFloat(paymentModel.getProperty("/TotalAmount")) || 0;
                var receivedAmount = parseFloat(paymentModel.getProperty("/ReceivedAmount")) || 0;
                var receivedTDS = parseFloat(paymentModel.getProperty("/ReceivedTDS")) || 0;
                var AllreceivedTDS = parseFloat(this.getView().getModel("InvoicePayment").getProperty("/AllReceivedTDS")) || 0;

                var dueAmount = totalAmount - totalReceivedAmount - receivedAmount - receivedTDS - AllreceivedTDS;
                paymentModel.setProperty("/DueAmount", dueAmount.toFixed(2));
                this.onChangePaymentConvertionRate();
            },

            onChangeReceivedTDS: function () { this.onChangeReceivedAmount() },

            Readcall: async function (entity, filterValue) {
                const oData = await this.ajaxReadWithJQuery(entity, filterValue);
                if (entity === "CompanyInvoice") {
                    const invoiceData = oData.data?.[0] || {};
                    if (invoiceData.Currency !== "INR") {
                        invoiceData.AmountInFCurrency = invoiceData.AmountInINR;
                    }
                    this.getView().setModel(new JSONModel(invoiceData), "SelectedCustomerModel");
                    this.Status = invoiceData.Status;
                    return;
                }
                // Handle non-"CompanyInvoice" case
                const view = this.getView();
                view.setModel(new JSONModel(oData.data), "InvoicePayment");
                view.setModel(new JSONModel({ InvoicePaymentDetail: oData.data }), "PaymentDetailModel");
                const items = oData.data || [];
                const totalReceivedAmount = items.reduce((sum, item) => sum + (parseFloat(item.ReceivedAmount) || 0), 0);
                const totalReceivedTDS = items.reduce((sum, item) => sum + (parseFloat(item.ReceivedTDS) || 0), 0);
                const totalAmount = parseFloat(items[0]?.TotalAmount || 0);
                const totalDueAmount = totalAmount - (totalReceivedAmount + totalReceivedTDS);
                const invoiceModel = view.getModel("InvoicePayment");
                invoiceModel.setProperty("/AllReceivedAmount", totalReceivedAmount.toFixed(2));
                invoiceModel.setProperty("/AllReceivedTDS", totalReceivedTDS.toFixed(2));
                invoiceModel.setProperty("/AllDueAmount", totalDueAmount.toFixed(2));
                invoiceModel.setProperty("/AllReceiveTDS", totalReceivedTDS.toFixed(2));
            },

            onPressInvClose:function(){ this.oDialog.close() },
            onLiveReceivedTDS:function(oEvent){ utils._LCvalidateAmount(oEvent) },
            onLiveConversion:function(oEvent){ utils._LCvalidateAmount(oEvent)},
            onLiveTransactionID:function(oEvent){ utils._LCvalidateMandatoryField(oEvent) },

            onChangePaymentRecived:async function(){
                if(utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idTransactionID"),"ID") && utils._LCvalidateAmount(sap.ui.getCore().byId("idReceivedAmount"),"ID") && utils._LCvalidateAmount(sap.ui.getCore().byId("idReceivedTDS"),"ID")){
                     var jsonData = {
                        InvNo: String(paymentModel.InvNo),
                        TransactionId: String(paymentModel.TransactionId),
                        ReceivedDate: String(paymentModel.ReceivedDate),
                        ReceivedAmount: String(paymentModel.ReceivedAmount),
                        TotalAmount: String(paymentModel.TotalAmount),
                        DueAmount: String(paymentModel.DueAmount),
                        Currency: String(paymentModel.Currency),
                        ReceivedTDS: String(paymentModel.ReceivedTDS),
                        ConversionRate: (paymentModel.Currency !== "INR") ? String(paymentModel.ConversionRate) : "",
                        AmountInINR: (paymentModel.Currency !== "INR") ? String(paymentModel.AmountInINR) : ""
                    }

                    await this.ajaxCreateWithJQuery("combineSowMsa").then((oData) => {
                    if (oData.success) {
                        var oJson = new JSONModel({ items: oData.combinedData });
                        this.getView().setModel(oJson, "CombinedData");
                        this.closeBusyDialog();
                        this.onChangeInvoiceDate();
                    }
                }).catch((error) => {
                    this.closeBusyDialog();
                    MessageToast.show(error.responseText);
                });
                }else{
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            }




        });
    });