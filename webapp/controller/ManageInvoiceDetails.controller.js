sap.ui.define([
        "./BaseController", //call base controller
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageToast",
        "../utils/validation",
        "sap/ui/model/odata/type/Currency",
        "../model/formatter",
        "sap/m/MessageBox",
    ],
    function(BaseController, JSONModel, MessageToast, utils, Currency, Formatter, MessageBox) {
        "use strict";
        return BaseController.extend("sap.ui.com.project1.controller.ManageInvoiceDetails", {
            Formatter: Formatter,
            onInit: function() {
                this.getOwnerComponent().getRouter().getRoute("RouteManageInvoiceDetails").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function(oEvent) {
                this.getBusyDialog()
                var sArg = oEvent.getParameter("arguments").sPath;
                var sSource = oEvent.getParameter("arguments").dash; // Get the source parameter
                this.sourceView = sSource || "ManageInvoice";

                this.scrollToSection("CID_id_CmpInvObjectPageLayout", "CID_id_CmpInvGoals");
                this._makeDatePickersReadOnly(["CID_id_Invoice", "CID_id_Payby", "CID_id_NavInvoice", "CID_id_NavPayby", "CI_Id_Status", "CID_id_Date", "CID_id_NavInvDate"]);

                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.loginModel = this.getView().getModel("LoginModel");

                var loginModel = this.getOwnerComponent().getModel("LoginModel");
                this.BranchCode = loginModel.getProperty("/BranchCode");
                this.decodedPath = decodeURIComponent(decodeURIComponent(sArg));
                this.Discount = true;
                this.RateUnit = true;
                this.Particulars = true;
                this.mobileNo = true;
                this.ResivedTDSFlag = true;
                this.byId("CID_id_AddCustComboBox").setValueState("None");
                this.byId("CID_id_AddBooking").setValueState("None");
                this.byId("CID_id_InvoiceDesc").setValueState("None");
                this.byId("CID_id_ConversionRate").setValueState("None");
                this.byId("CID_id_InputMailID").setValueState("None");
                this.byId("CID_id_InputMobileNo").setValueState("None");

                // this.byId("CID_id_IncomeTaxPercentage").setValueState("None");
                this.byId("CID_id_CurrencySelect").setEditable(true);
                const oView = this.getView();
                if (this.getView().getModel("ManageInvoiceModel")) {
                    if (this.getView().getModel("ManageInvoiceModel").getData().length === 0) {
                        var LastInvoiceDate = new Date()
                    } else {
                        var LastInvoiceDate = new Date(this.getView().getModel("ManageInvoiceModel").getData()[0].InvoiceDate)
                    }
                }

                oView.setModel(new JSONModel({
                    BookingID: "",
                    CustomerName: "",
                    InvNo: "",
                    InvDate: "",
                    InvoiceDate: "",
                    Name: "",
                    // PAN: "",
                    GST: "",
                    PermanentAddress: "",
                    CustomerEmail: "",
                    MobileNo: "",
                    SOWDetails: "",
                    Type: "",
                    InvoiceDescription: "",
                    Currency: "INR",
                    PayByDate: "",
                    POSOW: "",
                    Status: "Submitted",
                    SubTotalNotGST: "0",
                    SubTotalInGST: "0",
                    LUT: "",
                    IncomePerc: "10",
                    RoomNo: "",
                    BranchCode: "",
                    RefundAmount: ""
                }), "SelectedCustomerModel");
                this.SelectedCustomerModel = oView.getModel("SelectedCustomerModel");

                oView.setModel(new JSONModel({
                    BookingID: "",
                }), "BookingModel");

                oView.setModel(new JSONModel({
                    results: [],
                    InvNo: this.newID,
                    IndexNo: "",
                    ItemID: "",
                    UnitText: "",
                    Particulars: "",
                    SAC: "",
                    Rate: "",
                    Currency: "INR",
                    Total: "",
                    GrossPrice: "",
                    gstAmount: "",
                    TotalAmount: "",
                    subTotal: ""
                }), "FilteredSOWModel");

                oView.setModel(new JSONModel({
                    createVisi: true,
                    editVisi: false,
                    editable: true,
                    igstVisi: false,
                    gstVisiable: false,
                    flexVisiable: false,
                    CInvoice: false,
                    addInvBtn: true,
                    refresh: false,
                    merge: false,
                    GST: true,
                    payByDate: false,
                    Form: true,
                    Table: false,
                    MultiEmail: true,
                    Edit: true,
                    IncomeTax: true,
                    minDate: LastInvoiceDate
                }), "visiablityPlay");

                oView.setModel(new JSONModel({
                    AllReceivedAmount: 0,
                    AllDueAmount: 0
                }), "InvoicePayment");

                var SowDataModel = new JSONModel({
                    items: []
                });
                this.getView().setModel(SowDataModel, "CombinedData");
                this.visiablityPlay = oView.getModel("visiablityPlay");
                this.visiablityPlay.setProperty("/Edit", false);
                this.visiablityPlay.setProperty("/MultiEmail", false);
                this.visiablityPlay.setProperty("/merge", false);
                oView.setModel(new JSONModel(), "ManageInvoiceItemModel");
                // this.byId("CID_id_TableInvoiceItem").setMode("Delete");
                this.Update = false;
                if (sArg === "X") {
                    const oNavCtx = this.getOwnerComponent().getModel("InvoiceNavContext");
                    const sBookingID = oNavCtx?.getProperty("/BookingID");
                    const sCustomerName = oNavCtx?.getProperty("/CustomerName");

                    const oCustomerCombo = this.byId("CID_id_AddCustComboBox");
                    const oBookingCombo = this.byId("CID_id_AddBooking");

                    if (sCustomerName && sBookingID) {
                        oCustomerCombo.setSelectedKey(null);
                        oBookingCombo.setSelectedKey(null);
                        sap.ui.getCore().applyChanges();

                        oCustomerCombo.setSelectedKey(sCustomerName); // Set selected keys
                        oBookingCombo.setSelectedKey(sBookingID);
                        this.SelectKey = sBookingID; // Store customer for booking 
                        oCustomerCombo.setEditable(false); // Lock customer selection

                        const customerData = [{
                            BookingID: sBookingID,
                            CustomerName: sCustomerName
                        }];
                        this.getView().setModel(new sap.ui.model.json.JSONModel(customerData), "ManageCustomerModel");

                        const bookingData = [{
                            BookingID: sBookingID,
                            Status: "Assigned"
                        }];
                        this.getView().setModel(new sap.ui.model.json.JSONModel(bookingData), "BookingModel");

                        // Clear invoice items before loading
                        this.getView().setModel(new sap.ui.model.json.JSONModel({
                            ManageInvoiceItem: []
                        }), "ManageInvoiceItemModel");

                        await this.onChangeBookingID({
                            getSource: () => oBookingCombo
                        });

                        // Clear navigation context
                        oNavCtx.setProperty("/CustomerName", "");
                        oNavCtx.setProperty("/BookingID", "");
                    } else {
                        const oNavCtx = this.getOwnerComponent().getModel("InvoiceNavContext");
                        if (oNavCtx) {
                            oNavCtx.setProperty("/CustomerName", "");
                            oNavCtx.setProperty("/BookingID", "");
                        }

                        oCustomerCombo.setSelectedKey(null); // Also clear ComboBox UI state
                        oBookingCombo.setSelectedKey(null);
                        sap.ui.getCore().applyChanges();

                        oCustomerCombo.setEditable(true);
                        await this.onSearch();
                    }
                    this.closeBusyDialog()
                    return;
                }
                this.visiablityPlay.setProperty("/Edit", true);
                this.visiablityPlay.setProperty("/flexVisiable", true);
                this.visiablityPlay.setProperty("/createVisi", false);
                this.visiablityPlay.setProperty("/editVisi", true);
                this.visiablityPlay.setProperty("/editable", false);
                this.visiablityPlay.setProperty("/addInvBtn", false);
                this.visiablityPlay.setProperty("/refresh", false);
                this.visiablityPlay.setProperty("/MultiEmail", false);
                // this.byId("CID_id_TableInvoiceItem").setMode("None");
                this.byId("CID_id_CurrencySelect").setEditable(false);
                this.visiablityPlay.setProperty("/merge", true);
                this.visiablityPlay.setProperty("/MultiEmail", true);

                this.getBusyDialog()
                try {
                    const oData = await this.ajaxReadWithJQuery("HM_ManageInvoiceItem", {
                        InvNo: this.decodedPath
                    });
                    this.Update = true;
                    if (!oData.success) throw new Error("Invalid data structure");

                    var oHeader = oData.data.ManageInvoice?.[0] || {};
                    this.byId("CID_id_Payby").setMinDate(new Date(oHeader.InvoiceDate));
                    this.byId("CID_id_NavPayby").setMinDate(new Date(oHeader.InvoiceDate));
                    oHeader.InvoiceDate = this.Formatter.DateFormat(oHeader.InvoiceDate);
                    var PayByDate = oHeader.PayByDate;
                    oHeader.PayByDate = this.Formatter.DateFormat(oHeader.PayByDate);
                    var InvDate = oHeader.InvDate
                    oHeader.InvDate = this.Formatter.formatDate(InvDate);
                    this.SelectedCustomerModel.setData(oHeader);

                    // ---- GST checkbox derived selection ----
                    const igst = parseFloat(oHeader.IGST) || 0;
                    const cgst = parseFloat(oHeader.CGST) || 0;
                    const sgst = parseFloat(oHeader.SGST) || 0;

                    // reset first
                    this.SelectedCustomerModel.setProperty("/IGSTSelected", false);
                    this.SelectedCustomerModel.setProperty("/CGSTSelected", false);

                    if (igst > 0) {
                        this.SelectedCustomerModel.setProperty("/IGSTSelected", true);
                    } else if (cgst > 0 || sgst > 0) {
                        this.SelectedCustomerModel.setProperty("/CGSTSelected", true);
                    }

                    const aItems = oData.data.ManageInvoiceItem.map((item, index) => ({
                        ...item,
                        IndexNo: index + 1,
                        StartDate: item.StartDate ? this.Formatter.DateFormat(item.StartDate) : "",
                        EndDate: item.EndDate ? this.Formatter.DateFormat(item.EndDate) : "",
                        GrossPriceEditable: false,
                        UnitEditable: false,
                        DurationEditable: false,
                        StartDateEditable: false,
                        EndDateEditable: false
                        // editable :false
                    }));

                    oView.setModel(new JSONModel({
                        ManageInvoiceItem: aItems
                    }), "ManageInvoiceItemModel");

                    const {
                        IGST = "0", SGST = "0", CGST = "0", Value, Currency, Status, InvNo
                    } = oHeader;
                    this.getView().getModel("FilteredSOWModel").setProperty("/Currency", Currency);
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
                        // this.visiablityPlay.setProperty("/Edit", false);
                        this.visiablityPlay.setProperty("/MultiEmail", false);
                    }
                    this.Status = Status;
                    await this.Readcall("HM_InvoicePaymentDetail", {
                        InvNo: this.decodedPath
                    })
                    await this.totalAmountCalculation();
                } catch (error) {
                    MessageToast.show(error.responseText || "Failed to Load Invoice Data.");
                } finally {
                    this.closeBusyDialog()
                }
            },

            onSearch: function() {
                return new Promise((resolve, reject) => {
                    this.getBusyDialog()

                    var filter = {
                        BranchCode: this.BranchCode
                    };

                    this.ajaxReadWithJQuery("HM_CustomerReadCall", filter)
                        .then((oData) => {
                            var aData = Array.isArray(oData.commentData) ?
                                oData.commentData : [oData.commentData];

                            const aFilteredData = aData.filter(item =>
                                item.Status === "Assigned" || item.Status === "Completed"
                            );

                            this.getView().setModel(
                                new sap.ui.model.json.JSONModel(aFilteredData),
                                "ManageCustomerModel"
                            );

                            resolve(); 
                        }).catch((err) => {
                            MessageToast.show(err.responseText || "Failed to Load Customer Data.");
                            this.closeBusyDialog()
                        })
                });
            },

            onNavBack: function() {
                if (this.sourceView === "Customerinvoice") {
                    this.getOwnerComponent().getRouter().navTo("RouteManageProfile");
                } else if (this.sourceView === "AdminPage") {
                    this.getOwnerComponent().getRouter().navTo("RouteAdmin", {
                        sPath: "ManageInvoice"
                    });
                } else if (this.sourceView === "PaymentDashboard") {
                    this.getOwnerComponent().getRouter().navTo("RouteHostelDashboard");
                } else {
                    this.getOwnerComponent().getRouter().navTo("RouteManageInvoice", {
                        sPath: "ManageInvoicedetails"
                    });
                }
            },

            onHome: function() {
                this.CommonLogoutFunction();
            },

            onChangeAddCustomer: async function(oEvent) {
                try {
                    utils._LCvalidateMandatoryField(oEvent);

                    this.SelectKey = oEvent.getSource().getSelectedItem().getAdditionalText()
                    const allData = this.getView().getModel("ManageCustomerModel").getData();

                    // Filter selected customer record
                    const SelectedData = allData.find(item => item.BookingID === this.SelectKey);
                    if (!SelectedData) return;

                    // Filter booking list for selected customer
                    const bookingList = allData.filter(item => item.BookingID === this.SelectKey).map(i => ({
                        BookingID: i.BookingID,
                        Status: i.Status
                    }));

                    const bookingModel = new sap.ui.model.json.JSONModel(bookingList);
                    this.getView().setModel(bookingModel, "BookingModel");

                    // Reset booking combo
                    this.byId("CID_id_AddBooking").setSelectedKey("");
                    
                    // Reset selected key properly
                    this.getView().getModel("SelectedCustomerModel").setProperty("/BookingID", "");

                    // Reset invoice model
                    this.getView().getModel("ManageInvoiceItemModel").setProperty("/ManageInvoiceItem", []);
                } catch (err) {
                    MessageToast.show(err.message);
                } finally {
                    this.closeBusyDialog()
                }
            },

            onChangeBookingID: async function(oEvent) {
                try {
                    const bookingID = oEvent.getSource().getSelectedKey();
                    this.getView().getModel("SelectedCustomerModel").setProperty("/BookingID", bookingID);

                    if (!bookingID) return;

                    this.getBusyDialog()

                    const oData = await this.ajaxCreateWithJQuery("HM_getAllInvoiceData", {
                        data: {
                            BookingID: bookingID
                        }
                    });

                    const bookingDetails = oData.data?.BookingData?.[0];

                    const facilityArray = Array.isArray(oData.data.BookingFacilityItems) ?
                        oData.data.BookingFacilityItems : [oData.data.BookingFacilityItems];

                    if (!bookingDetails && facilityArray.length === 0) {
                        MessageBox.information("Booking is Fully Completed. No new Invoice can be Generated.");
                        return;
                    }

                    const paymentType = bookingDetails.PaymentType;
                    const startDate = new Date(bookingDetails.StartDate);
                    const endDate = new Date(bookingDetails.EndDate);

                    let invoiceDate, payByDate;

                    if (paymentType === "Per Day") {
                        invoiceDate = startDate;
                        payByDate = endDate;
                    } else {
                        invoiceDate = startDate;
                        payByDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 3);
                    }

                    const oModel = this.getView().getModel("SelectedCustomerModel");
                    let mergedData = {};
                    if (oData.data.ManageCustomer && oData.data.ManageCustomer.length > 0) {
                        mergedData = Object.assign({}, oData.data.ManageCustomer[0], {
                            RoomNo: bookingDetails.RoomNo || "",
                            BranchCode: bookingDetails.BranchCode || "",
                            CouponDiscount: bookingDetails.Discount || "",
                            CustomerName: bookingDetails.CustomerName,
                            BookingID: bookingID,
                            UserID: bookingDetails.UserID || "",
                            PaidAmount: oData.data.PerMonthTotalRent || "0.00",
                            CouponCode: bookingDetails.CouponCode,
                            GST: bookingDetails.GSTIN || "",
                            Type: bookingDetails.GSTType || "",
                            Value: bookingDetails.GSTValue || "",
                            CustomerGSTNO: bookingDetails.CustomerGSTIN || ""
                        });
                    }

                    mergedData.InvoiceDate = new Date(invoiceDate);
                    mergedData.PayByDate = new Date(payByDate);
                    mergedData.InvDate = new Date();
                    mergedData.InvoiceDescription = this._getInvoiceDescription(invoiceDate);
                    oModel.setData(mergedData);

                    const oCustomerModel = this.getView().getModel("SelectedCustomerModel");

                    // ---- GST auto mapping from BranchDetails ----
                    if (mergedData.Type) {
                        oCustomerModel.setProperty("/GST", mergedData.GST);
                        oCustomerModel.setProperty("/GSTValid", true);

                        // Set percentage
                        oCustomerModel.setProperty("/Value", mergedData.Value || "");

                        // Select GST Type
                        if (mergedData.Type === "CGST/SGST") {
                            oCustomerModel.setProperty("/Type", "CGST/SGST");
                            oCustomerModel.setProperty("/CGSTSelected", true);
                            oCustomerModel.setProperty("/IGSTSelected", false);
                        } else if (mergedData.Type === "IGST") {
                            oCustomerModel.setProperty("/Type", "IGST");
                            oCustomerModel.setProperty("/CGSTSelected", false);
                            oCustomerModel.setProperty("/IGSTSelected", true);
                        }
                    } else {
                        // Reset GST section if no GST from backend
                        oCustomerModel.setProperty("/GSTValid", false);
                        oCustomerModel.setProperty("/Type", "");
                        oCustomerModel.setProperty("/Value", "");
                        oCustomerModel.setProperty("/CGSTSelected", false);
                        oCustomerModel.setProperty("/IGSTSelected", false);
                    }

                    this.byId("CID_id_Invoice").setMinDate(invoiceDate);
                    this.byId("CID_id_Payby").setMinDate(invoiceDate);

                    this.byId("CID_id_Invoice").setDateValue(invoiceDate);
                    this.byId("CID_id_Payby").setDateValue(payByDate);

                    let finalInvoiceItems = [];
                    const bookingDuration = this._getDurationText(
                        bookingDetails.PaymentType,
                        bookingDetails.StartDate,
                        bookingDetails.EndDate
                    );

                    finalInvoiceItems.push({
                        IndexNo: 1,
                        InvNo: this.newID,
                        Particulars: `${bookingDetails.BedType} - Room Rent`,
                        UnitText: bookingDetails.PaymentType,
                        DurationText: bookingDuration,
                        SAC: "996322",
                        GSTCalculation: "YES",
                        Discount: "0.00",
                        GrossPrice: bookingDetails.RoomPrice,
                        Total: parseFloat(bookingDetails.BookingPrice),
                        StartDate: this.Formatter.DateFormat(bookingDetails.StartDate),
                        EndDate: this.Formatter.DateFormat(bookingDetails.EndDate),
                        Currency: bookingDetails.Currency,
                        GrossPriceEditable: false,
                        UnitEditable: false,
                        DurationEditable: false,
                        StartDateEditable: false,
                        EndDateEditable: false
                    });

                    facilityArray.forEach((item, index) => {
                        const durationText = this._getDurationText(
                            item.UnitText,
                            item.StartDate,
                            item.EndDate,
                            item.TotalHour,
                            item.SelectionMode,
                            item.Quantity
                        );

                        let particulars = "";
                        const memberSuffix = item.MemberName ? ` (${item.MemberName})` : "";

                        // Build Particulars
                        if (item.FacilityName === "Penalty Charges") {
                            particulars = `Penalty Charges${memberSuffix}`;
                        } else if (item.UnitText === "Per Hour") {
                            const totalHours = Number(item.TotalHour) || 1;
                            particulars = `${item.FacilityName} - Facility (${totalHours} Hours)${memberSuffix}`;
                        } else {
                            particulars = `${item.FacilityName} - Facility${memberSuffix}`;
                        }

                        finalInvoiceItems.push({
                            IndexNo: index + 2,
                            InvNo: this.newID,
                            Particulars: particulars,
                            UnitText: item.UnitText,
                            DurationText: durationText,
                            SAC: "996322",
                            GSTCalculation: "YES",
                            Discount: "0.00",
                            GrossPrice: item.BasicFacilityPrice,
                            Total: parseFloat(item.FacilitiPrice),
                            StartDate: this.Formatter.DateFormat(item.StartDate),
                            EndDate: this.Formatter.DateFormat(item.EndDate),
                            Currency: item.Currency,
                            GrossPriceEditable: false,
                            UnitEditable: false,
                            DurationEditable: false,
                            StartDateEditable: false,
                            EndDateEditable: false
                        });
                    });

                    // REFUND PROCESSED LINE ITEM AUTO CREATE
                    const refundAmount = parseFloat(oData.data.ManageInvoice?.[0]?.RefundAmount || 0);
                    const refundProcessed = oData.data.ManageInvoice?.[0]?.RefundProcessed;

                    if (refundAmount > 0 && (!refundProcessed || refundProcessed === "")) {
                        finalInvoiceItems.push({
                            IndexNo: finalInvoiceItems.length + 1,
                            InvNo: this.newID,
                            Particulars: `Refund Processed for Invoice No :  ${oData.data.ManageInvoice[0].InvNo}`,
                            UnitText: "Fix",
                            DurationText: "-",
                            SAC: "996322",
                            GSTCalculation: "NO",
                            Discount: "0.00",
                            GrossPrice: -refundAmount,
                            Total: -refundAmount,
                            StartDate: this.Formatter.DateFormat(new Date()),
                            EndDate: this.Formatter.DateFormat(new Date()),
                            Currency: bookingDetails.Currency,
                            GrossPriceEditable: false,
                            UnitEditable: false,
                            DurationEditable: false,
                            StartDateEditable: false,
                            EndDateEditable: false
                        });
                    }

                    this.getView().getModel("ManageInvoiceItemModel").setProperty("/ManageInvoiceItem", finalInvoiceItems);
                    await this.totalAmountCalculation();
                    utils._LCvalidateMandatoryField(oEvent);
                } catch (err) {
                    MessageToast.show(err.message);
                } finally {
                    this.closeBusyDialog()
                }
            },

            _getDurationText: function(sUnit, sStartDate, sEndDate, totalHour, selectionMode, quantity) {

                const qty = Number(quantity) || 1;
                const mode = selectionMode?.toUpperCase();
                const unit = sUnit?.toLowerCase();

                // -------------------------
                // VALIDATE DATES
                // -------------------------
                if (!sStartDate || !sEndDate) return "";

                const start = new Date(sStartDate);
                const end = new Date(sEndDate);

                const diffTime = end - start;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let baseDuration = "";

                // -------------------------
                // BASE DURATION CALCULATION
                // -------------------------
                if (unit === "per day") {
                    baseDuration = diffDays + (diffDays === 1 ? " Day" : " Days");
                } else if (unit === "per month") {

                    let months =
                        (end.getFullYear() - start.getFullYear()) * 12 +
                        (end.getMonth() - start.getMonth());

                    if (end.getDate() >= start.getDate()) {
                        months += 1;
                    }

                    baseDuration = months + (months === 1 ? " Month" : " Months");
                } else if (unit === "per year") {

                    if (diffDays < 364) {
                        baseDuration = diffDays + " Days";
                    } else {
                        const years = Math.round(diffDays / 365);
                        baseDuration = years + (years === 1 ? " Year" : " Years");
                    }
                } else if (unit === "per hour") {

                    const hoursPerDay = Number(totalHour) || 1;
                    const totalHours = hoursPerDay * diffDays;

                    baseDuration = totalHours + (totalHours === 1 ? " Hour" : " Hours");
                } else if (unit === "unit price" || unit === "package price") {
                    baseDuration = "";
                } else if (unit === "fix") {
                    return "-";
                }

                if (mode === "SINGLE") {

                    if (unit === "per day") {
                        return diffDays + (diffDays === 1 ? " Day" : " Days");
                    }

                    if (unit === "per month") {

                        let months =
                            (end.getFullYear() - start.getFullYear()) * 12 +
                            (end.getMonth() - start.getMonth());

                        if (end.getDate() >= start.getDate()) {
                            months += 1;
                        }

                        return months + (months === 1 ? " Month" : " Months");
                    }

                    if (unit === "per year") {

                        if (diffDays < 364) {
                            return diffDays + " Days";
                        }

                        const years = Math.round(diffDays / 365);

                        return years + (years === 1 ? " Year" : " Years");
                    }

                    if (unit === "per hour") {

                        const hoursPerDay = Number(totalHour) || 1;
                        const totalHours = hoursPerDay * diffDays;

                        return totalHours + (totalHours === 1 ? " Hour" : " Hours");
                    }

                    if (unit === "unit price") {
                        return "Unit Price";
                    }

                    if (unit === "package price") {
                        return "Package Price";
                    }

                    if (unit === "fix") {
                        return "-";
                    }

                    return sUnit;
                }

                // SELECTION MODE HANDLING
                if (mode === "QTY") {

                    if (unit === "unit price" || unit === "package price") {
                        return `${qty} Qty`;
                    }

                    return `${qty} Qty × ${baseDuration}`;
                }

                if (mode === "PERSON") {

                    if (unit === "unit price" || unit === "package price") {
                        return `${qty} Persons`;
                    }

                    return `${qty} Persons × ${baseDuration}`;
                }

                if (mode === "PERSON_QTY") {

                    if (unit === "unit price" || unit === "package price") {
                        return `${qty} Units`;
                    }

                    if (unit === "per day") {

                        const totalUnits = qty * diffDays;

                        return `${totalUnits} Units (${qty} × ${diffDays} Days)`;
                    }

                    return `${qty} Units × ${baseDuration}`;
                }

                return baseDuration;
            },

            onChangeInvoiceDate: function(oEvent) {
                const selectedDate = oEvent.getSource().getDateValue();
                if (!selectedDate) return;

                const payByDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 3);

                this.byId("CID_id_Payby").setDateValue(payByDate);
                this.byId("CID_id_Invoice").setMinDate(selectedDate);
                this.byId("CID_id_Payby").setMinDate(selectedDate);

                const oModel = this.getView().getModel("SelectedCustomerModel");

                oModel.setProperty("/InvoiceDate", selectedDate);
                oModel.setProperty("/PayByDate", payByDate);
                oModel.setProperty("/InvoiceDescription", this._getInvoiceDescription(selectedDate));
                utils._LCvalidateDate(oEvent);
            },

            onPayByDateDatePickerChange: function(oEvent) {
                utils._LCvalidateDate(oEvent);
            },

            onChangeDate: function(oEvent) {
                utils._LCvalidateDate(oEvent);
            },

            _getInvoiceDescription: function(oDate) {
                if (!oDate) return "";

                const aMonths = [
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ];

                const monthName = aMonths[oDate.getMonth()];
                const year = oDate.getFullYear();

                return `Invoice for ${monthName} ${year}`;
            },

            CID_onPressAddInvoiceItems: function(oEvent) {
                const oView = this.getView();
                const oItemModel = oView.getModel("ManageInvoiceItemModel");
                let oData = oItemModel.getProperty("/ManageInvoiceItem") || [];

                const currency = this.byId("CID_id_CurrencySelect").getValue();
                this.IndexNo = oData.length ? oData[oData.length - 1].IndexNo + 1 : 1;

                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 1);
                const unitText = "Fix"; // default unit

                const newItem = {
                    IndexNo: this.IndexNo,
                    Particulars: "",
                    SAC: "996322",
                    GSTCalculation: (currency === "INR") ? "YES" : "",
                    StartDate: this.Formatter.formatDate(startDate),
                    EndDate: this.Formatter.formatDate(endDate),
                    UnitText: unitText,
                    DurationText: this._getDurationText(unitText, startDate, endDate, 1),
                    Currency: currency,
                    Discount: "0.00",
                    GrossPrice: "0.00",
                    Total: "",
                    GrossPriceEditable: true,
                    UnitEditable: true,
                    DurationEditable: true,
                    StartDateEditable: true,
                    EndDateEditable: true
                };

                if (this.Update) {
                    newItem.flag = "create";
                }

                oData.push(newItem);
                oItemModel.setProperty("/ManageInvoiceItem", oData);
                oItemModel.refresh(true);
            },

            onChangeUnitText: function(oEvent) {
                const oItem = oEvent.getSource().getBindingContext("ManageInvoiceItemModel").getObject();
                const unit = oItem.UnitText;

                oItem.DurationText = this._getText(unit, oItem.StartDate, oItem.EndDate, oItem.TotalHour || 1);

                this.getView().getModel("ManageInvoiceItemModel").refresh(true);
            },

            _getText: function(sUnit, sStartDate, sEndDate, totalHour) {
                if (!sStartDate || !sEndDate) return "";

                const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                    pattern: "dd/MM/yyyy"
                });

                const start = oDateFormat.parse(sStartDate);
                const end = oDateFormat.parse(sEndDate);

                if (!start || !end) return "";

                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (sUnit === "Per Day") {
                    return diffDays + (diffDays === 1 ? " Day" : " Days");
                }

                if (sUnit === "Per Month") {
                    let months =
                        (end.getFullYear() - start.getFullYear()) * 12 +
                        (end.getMonth() - start.getMonth());

                    if (end.getDate() >= start.getDate()) months += 1;

                    return months + (months === 1 ? " Month" : " Months");
                }

                if (sUnit === "Per Year") {
                    if (diffDays < 364) {
                        return diffDays + " Days";
                    }

                    const years = Math.round(diffDays / 365);
                    return years + (years === 1 ? " Year" : " Years");
                }

                if (sUnit === "Per Hour") {
                    const hoursPerDay = Number(totalHour) || 1;
                    const totalHours = hoursPerDay * diffDays;
                    return totalHours + (totalHours === 1 ? " Hour" : " Hours");
                }

                if (sUnit === "Fix") {
                    return "-";
                }

                return "";
            },

            onChangeTotal: function(oEvent) {
                const oInput = oEvent.getSource();
                const oCtx = oInput.getBindingContext("ManageInvoiceItemModel");
                if (!oCtx) return;

                let value = oEvent.getParameter("value") || "0";
                value = value.replace(/,/g, ""); // remove formatting commas
                this.getView().getModel("ManageInvoiceItemModel").setProperty(oCtx.getPath() + "/Total", value);
                this.totalAmountCalculation();
            },

            totalAmountCalculation: function() {
                const oView = this.getView();
                const oSOWModel = oView.getModel("FilteredSOWModel");
                const oInvoiceModel = oView.getModel("ManageInvoiceItemModel");
                const oCustomerModel = oView.getModel("SelectedCustomerModel");

                let aItems = oInvoiceModel.getProperty("/ManageInvoiceItem") || [];

                let totalWithGST = 0;
                let totalWithoutGST = 0;

                // ---------------- GST MASTER CHECK ----------------
                const taxType = oCustomerModel.getProperty("/Type");
                const taxRate = parseFloat(oCustomerModel.getProperty("/Value")) || 0;
                const currency = oSOWModel.getProperty("/Currency");

                const isGSTEnabled = !!taxType &&
                    taxRate > 0 &&
                    currency === "INR";

                this.visiablityPlay.setProperty("/GST", isGSTEnabled);

                // ---------------- ITEM CALCULATION ----------------
                aItems.forEach((item) => {

                    // Original amount
                    const baseAmount = parseFloat(item.Total) || 0;

                    // ---------- DISCOUNT ----------
                    let discountAmount = 0;

                    if (typeof item.Discount === "string" && item.Discount.trim().endsWith("%")) {
                        discountAmount = baseAmount * (parseFloat(item.Discount) / 100);
                    } else {
                        discountAmount = parseFloat(item.Discount) || 0;
                    }

                    // Validation
                    if (discountAmount > baseAmount) {
                        discountAmount = 0;
                    }

                    // Final amount after item discount
                    const finalAmount = baseAmount - discountAmount;

                    // Store values
                    item.DiscountAmount = discountAmount.toFixed(2);
                    item.FinalAmount = finalAmount.toFixed(2);
                    item.Total = finalAmount.toFixed(2);

                    // ---------- GST LOGIC ----------
                    if (!isGSTEnabled) {
                        item.GSTCalculation = "NO";
                    }

                    const isGSTApplicable =
                        isGSTEnabled &&
                        item.GSTCalculation === "YES";

                    item.SAC =
                        isGSTApplicable ? "996322" : "-";

                    // GST applicable subtotal
                    if (isGSTApplicable) {
                        totalWithGST += finalAmount;
                    } else {
                        totalWithoutGST += finalAmount;
                    }
                });

                // ---------------- SUBTOTALS ----------------
                const subTotal = totalWithGST + totalWithoutGST;

                oCustomerModel.setProperty("/SubTotalInGST", totalWithGST.toFixed(2));
                oCustomerModel.setProperty("/SubTotalNotGST", totalWithoutGST.toFixed(2));
                oCustomerModel.setProperty("/SubTotal", subTotal.toFixed(2));

                // ---------------- COUPON ----------------
                let couponDiscount = parseFloat(oCustomerModel.getProperty("/CouponDiscount")) || 0;

                oCustomerModel.setProperty("/CouponDiscountValue", couponDiscount.toFixed(2));

                // ---------------- DISCOUNTED TOTAL ----------------
                let discountedTotal =
                    subTotal - couponDiscount;

                if (discountedTotal < 0) {
                    discountedTotal = 0;
                }

                oCustomerModel.setProperty("/DiscountedTotal", discountedTotal.toFixed(2));

                // ---------------- GST CALCULATION ----------------
                let gstAmount = 0;
                let finalAmount = discountedTotal;

                if (isGSTEnabled) {
                    // GST should apply after coupon discount
                    const taxableAmount = discountedTotal;

                    if (taxType === "CGST/SGST") {
                        gstAmount = (taxableAmount * taxRate) / 100;

                        const cgst = gstAmount;
                        const sgst = gstAmount;

                        finalAmount += cgst + sgst;

                        oCustomerModel.setProperty("/CGST", cgst.toFixed(2));
                        oCustomerModel.setProperty("/SGST", sgst.toFixed(2));
                        oCustomerModel.setProperty("/IGST", "0.00");
                    } else if (taxType === "IGST") {
                      gstAmount = (taxableAmount * taxRate) / 100;
                        finalAmount += gstAmount;
                        oCustomerModel.setProperty("/IGST", gstAmount.toFixed(2));
                        oCustomerModel.setProperty("/CGST", "0.00");
                        oCustomerModel.setProperty("/SGST", "0.00");
                    }
                } else {
                    oCustomerModel.setProperty("/CGST", "0.00");
                    oCustomerModel.setProperty("/SGST", "0.00");
                    oCustomerModel.setProperty("/IGST", "0.00");
                }

                // ---------------- ROUND OFF ----------------
                const roundedAmount = Math.round(finalAmount);

                const roundOffDiff = (roundedAmount - finalAmount).toFixed(2);
                oSOWModel.setProperty("/RoundOf", roundOffDiff);
                oSOWModel.setProperty("/gstAmount", gstAmount.toFixed(2));
                oSOWModel.setProperty("/TotalAmount", roundedAmount.toFixed(2));
                oCustomerModel.setProperty("/TotalAmount", roundedAmount.toFixed(2));

                // ---------------- PAYMENT ----------------
                let paidAmount = parseFloat(oCustomerModel.getProperty("/PaidAmount")) || 0;

                const oInvoicePaymentModel = oView.getModel("InvoicePayment");
                let allReceivedAmount = 0;

                if (oInvoicePaymentModel && oInvoicePaymentModel.getData()) {
                    allReceivedAmount = parseFloat(oInvoicePaymentModel.getProperty("/AllReceivedAmount")) || 0;
                }

                let totalPaid = paidAmount + allReceivedAmount;
                let balanceAmount = 0;
                let refundAmount = 0;

                if (totalPaid > roundedAmount) {
                    refundAmount = totalPaid - roundedAmount;
                    balanceAmount = 0;
                } else {
                    balanceAmount = roundedAmount - totalPaid;
                    refundAmount = 0;
                }

                oCustomerModel.setProperty("/PaidAmount", paidAmount.toFixed(2));
                oCustomerModel.setProperty("/BalanceAmount", balanceAmount.toFixed(2));
                oCustomerModel.setProperty("/RefundAmount", refundAmount.toFixed(2));

                oSOWModel.setProperty("/BalanceAmount", balanceAmount.toFixed(2));
                oSOWModel.setProperty("/RefundAmount", refundAmount.toFixed(2));

                oInvoiceModel.refresh(true);
                this.onChangeConversionRate();
            },

            Comp_onChangeGSTCalculation: function(oEvent) {
                const oItem = oEvent.getSource().getBindingContext("ManageInvoiceItemModel").getObject();
                const selectedKey = oEvent.getSource().getSelectedKey();

                // Update model directly (single source of truth)
                oItem.GSTCalculation = selectedKey;

                this.totalAmountCalculation();
            },

            onChangeConversionRate: function(oEvent) {
                if (oEvent) {
                    utils._LCvalidateAmount(oEvent);
                }
                var oModel = this.getView().getModel("FilteredSOWModel").getData().subTotal;
                var value = this.getView().getModel("SelectedCustomerModel");
                var data = parseFloat(value.getData().ConversionRate) * parseFloat(oModel);
                value.setProperty("/AmountInFCurrency", parseFloat(data).toFixed(2));
            },

            onChangeSowDetailsCal: async function(oEvent) {
                this.RateUnit = utils._LCvalidateAmount(oEvent);
                const oInput = oEvent.getSource();
                const oRowContext = oInput.getBindingContext("ManageInvoiceItemModel");
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
                    const subTotalInGST = parseFloat(oNavigationData.SubTotalInGST) || 0;
                    const subTotalNotGST = parseFloat(oNavigationData.SubTotalNotGST) || 0;
                    const incomePerc = parseFloat(oNavigationData.IncomePerc) || 0;

                    const totalAmount = subTotalInGST + subTotalNotGST;
                    const tds = ((totalAmount * incomePerc) / 100).toFixed(2);

                    oNavigationModel.setProperty("/IncomeTax", Math.round(tds));
                } else {
                    oNavigationModel.setProperty("/IncomeTax", "0.00");
                }
            },

            onParticularsInputLiveChange: function(oEvent) {
                this.Particulars = utils._LCvalidateMandatoryField(oEvent);
            },

            Comp_OnChangeDiscount: async function(oEvent) {
                var sValue = oEvent.getParameter("value").trim();
                var regex = /^[0-9]+(\.[0-9]{1,2})?%?$/;
                var oInput = oEvent.getSource();
                sValue = sValue.replace(/[^0-9.%]/g, "");

                var isPercentage = sValue.indexOf('%') !== -1;
                if (isPercentage) {
                    sValue = sValue.replace('%', '');
                }

                var parts = sValue.split('.');
                if (parts.length > 1) {
                    parts[1] = parts[1].substring(0, 2);
                    sValue = parts.join('.');
                }

                if (isPercentage) {
                    sValue = sValue + '%';
                }
                oInput.setValue(sValue);
                await this.totalAmountCalculation();
                if (!sValue) {
                    oInput.setValueState("None");
                    oInput.setValueStateText("");
                    // this.CI_updateTotalAmount();
                    this.Discount = true;
                } else if (!regex.test(sValue)) {
                    oInput.setValueState("Error");
                    oInput.setValueStateText(this.i18nModel.getText("discountValueText"));
                    this.Discount = false;
                } else {
                    oInput.setValueState("None");
                    oInput.setValueStateText("");
                    this.Discount = true;
                }

                var oNavigationModel = this.getView().getModel("SelectedCustomerModel");
                var oData = oNavigationModel.getData();

                if (oData.Currency === "INR") {
                    var subTotalInGST = parseFloat(oData.SubTotalInGST) || 0;
                    var subTotalNotGST = parseFloat(oData.SubTotalNotGST) || 0;
                    var incomePerc = parseFloat(oData.IncomePerc) || 0;

                    var tds = ((subTotalInGST + subTotalNotGST) * incomePerc / 100).toFixed(2);
                    oNavigationModel.setProperty("/IncomeTax", Math.round(tds));
                }
            },

            CID_ValidateDate: function(oEvent) {
                utils._LCvalidateDate(oEvent)
            },

            CID_ValidateGstNumber: function(oEvent) {
                var oInput = oEvent.getSource();
                utils._LCvalidateGstNumber(oEvent)
                if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
            },

            CID_ValidateDatePayByDate: function(oEvent) {
                utils._LCvalidateDate(oEvent)
                var [day, month, year] = oEvent.getSource().getValue().split('/').map(Number);
                var payByDate = new Date(year, month - 1, day);
                var today = new Date();
                var timeDiff = payByDate - today;
                var daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                if (daysDiff <= 10) {
                    this.ReminderEmail = true;
                } else {
                    this.ReminderEmail = false;
                }
            },

            SubmitPayload: async function(sMode) {
                const oView = this.getView();
                const oSelectedCustomerModel = oView.getModel("SelectedCustomerModel").getData();
                const oManageInvoiceItemModel = oView.getModel("ManageInvoiceItemModel").getData();
                var FilterModel = this.getView().getModel("FilteredSOWModel").getData()

                const oModel = {
                    subTotal: oSelectedCustomerModel.SubTotalInGST,
                    gstAmount: oSelectedCustomerModel.gstAmount,
                    TotalAmount: oSelectedCustomerModel.TotalAmount
                };

                const paidAmount = Number(oSelectedCustomerModel.PaidAmount) || 0;
                const totalAmount = Number(oSelectedCustomerModel.TotalAmount) || 0;
                const balanceAmount = Number(oSelectedCustomerModel.BalanceAmount) || 0;
                let sFinalStatus = "Submitted";

                if (paidAmount === totalAmount) {
                    sFinalStatus = "Payment Received";
                } else if (balanceAmount === totalAmount) {
                    sFinalStatus = "Submitted";
                } else if (paidAmount < totalAmount) {
                    sFinalStatus = "Payment Partially";
                } else if (paidAmount > totalAmount) {
                    sFinalStatus = "Payment Received";
                }

                const oPayload = {
                    InvDate: (sMode === 'update') ? oSelectedCustomerModel.InvDate.split('/').reverse().join('-') : this.Formatter.formatDate(oSelectedCustomerModel.InvDate).split('/').reverse().join('-') || "",
                    InvoiceDate: (sMode === 'update') ? oSelectedCustomerModel.InvoiceDate.split('/').reverse().join('-') : this.Formatter.formatDate(oSelectedCustomerModel.InvoiceDate).split('/').reverse().join('-') || "",
                    CustomerName: (sMode === 'update') ? oSelectedCustomerModel.CustomerName : oSelectedCustomerModel.CustomerName,
                    GST: oSelectedCustomerModel.GST != null ? String(oSelectedCustomerModel.GST) : '',
                    PermanentAddress: (oSelectedCustomerModel.PermanentAddress) || "",
                    // PAN: (oSelectedCustomerModel.PAN) || "",
                    MobileNo: oSelectedCustomerModel.MobileNo != null ? String(oSelectedCustomerModel.MobileNo) : '',
                    AmountInFCurrency: FilterModel.Currency === "INR" ?
                        (!isNaN(oSelectedCustomerModel.AmountInFCurrency) ? oSelectedCustomerModel.AmountInFCurrency : "0") : parseFloat(oModel.subTotal) || 0,
                    Currency: FilterModel.Currency || "",
                    ConversionRate: !isNaN(oSelectedCustomerModel.ConversionRate) ? parseFloat(oSelectedCustomerModel.ConversionRate) : 0,
                    AmountInINR: FilterModel.Currency === "INR" ?
                        parseFloat(oModel.subTotal) || 0 : parseFloat(oSelectedCustomerModel.AmountInFCurrency) || 0,
                    CGST: oSelectedCustomerModel.Type === "CGST/SGST" ? parseFloat(oSelectedCustomerModel.CGST) || 0 : 0,
                    SGST: oSelectedCustomerModel.Type === "CGST/SGST" ? parseFloat(oSelectedCustomerModel.SGST) || 0 : 0,
                    IGST: oSelectedCustomerModel.Type === "IGST" ? parseFloat(oSelectedCustomerModel.IGST) || 0 : 0,
                    TotalAmount: parseFloat(oModel.TotalAmount) || 0,
                    Status: sFinalStatus,
                    InvoiceDescription: oSelectedCustomerModel.InvoiceDescription || "",
                    IncomeTax: (FilterModel.Currency === "INR") ? oSelectedCustomerModel.IncomeTax : "",
                    CustomerEmail: oSelectedCustomerModel.CustomerEmail || "",
                    Type: oSelectedCustomerModel.Type || "",
                    Value: (!oSelectedCustomerModel.Value || isNaN(oSelectedCustomerModel.Value)) ? "0" : oSelectedCustomerModel.Value,
                    PayByDate: (sMode === 'update') ? oSelectedCustomerModel.PayByDate.split('/').reverse().join('-') : this.Formatter.formatDate(oSelectedCustomerModel.PayByDate).split('/').reverse().join('-') || "",
                    SubTotalNotGST: parseFloat(oSelectedCustomerModel.SubTotalNotGST) || 0,
                    SubTotalInGST: parseFloat(oSelectedCustomerModel.SubTotalInGST) || 0,
                    LUT: (oSelectedCustomerModel.LUT) || "",
                    IncomePerc: (FilterModel.Currency === "INR") ? oSelectedCustomerModel.IncomePerc || "10" : "",
                    BookingID: oSelectedCustomerModel.BookingID || "",
                    BranchCode: oSelectedCustomerModel.BranchCode || "",
                    RoomNo: oSelectedCustomerModel.RoomNo || "",
                    CouponDiscount: oSelectedCustomerModel.CouponDiscount || "",
                    UserID: oSelectedCustomerModel.UserID || "",
                    PaidAmount: oSelectedCustomerModel.PaidAmount || "",
                    BalanceAmount: oSelectedCustomerModel.BalanceAmount || "",
                    CouponCode: oSelectedCustomerModel.CouponCode || "",
                    CustomerGSTNO: oSelectedCustomerModel.CustomerGSTNO || "",
                    RefundAmount: oSelectedCustomerModel.RefundAmount || "",
                    DueAmount: oSelectedCustomerModel.BalanceAmount || ""
                };
                const aItemsRaw = oManageInvoiceItemModel.ManageInvoiceItem || [];
                if (aItemsRaw.length === 0) {
                    this.getBusyDialog()
                    MessageToast.show(this.i18nModel.getText("companyTableValidation"));
                    return false;
                }
                for (let i = 0; i < aItemsRaw.length; i++) {
                    const item = aItemsRaw[i];
                    if (!item.Particulars) {
                        this.getBusyDialog()
                        sap.m.MessageBox.error(`Please Fill all Mandatory Fields (Particulars) in Item Row ${i + 1}`);
                        return false;
                    }
                }
                const aItems = aItemsRaw.map(item => {
                    const itemData = {
                        InvNo: oSelectedCustomerModel.InvNo,
                        SAC: item.SAC,
                        UnitText: item.UnitText,
                        Particulars: item.Particulars,
                        GrossPrice: item.GrossPrice,
                        Total: item.Total,
                        Currency: item.Currency,
                        GSTCalculation: item.GSTCalculation,
                        Discount: item.Discount,
                        DurationText: item.DurationText,
                        StartDate: item.StartDate.split('/').reverse().join('-'),
                        EndDate: item.EndDate.split('/').reverse().join('-'),
                    };
                    if (sMode === "update") {
                        let filters;
                        if (item.flag === "create" || !item.ItemID) {
                            filters = {
                                flag: "create"
                            };
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

            CID_onPressSubmit: async function(oEvent) {
                try {
                    var that = this;
                    var oModel = this.getView().getModel("FilteredSOWModel").getData();
                    const bMandatoryValid =
                        utils._LCvalidateMandatoryField(this.byId("CID_id_AddCustComboBox"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_AddBooking"), "ID") &&
                        utils._LCvalidateDate(this.byId("CID_id_Date"), "ID") &&
                        utils._LCvalidateDate(this.byId("CID_id_Invoice"), "ID") &&
                        utils._LCvalidateDate(this.byId("CID_id_Payby"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_InvoiceDesc"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_CurrencySelect"), "ID");
                    // const bTDSValid = oModel.Currency === "INR" ? utils._LCvalidateVariablePay(this.byId("CID_id_IncomeTaxPercentage"), "ID") : true;
                    const bConversionRateValid = oModel.Currency !== "INR" ? utils._LCvalidateAmount(this.byId("CID_id_ConversionRate"), "ID") : true;
                    const bOptionalValid = this.Discount && this.RateUnit && this.Particulars;
                    const bIsValid = bMandatoryValid && bOptionalValid && bConversionRateValid;
                    if (!bIsValid) {
                        return MessageToast.show(that.i18nModel.getText("mandatoryFieldsError"));
                    }
                    this.getBusyDialog()
                    const oPayload = await this.SubmitPayload("Create");
                    if (oPayload === false) {
                        this.closeBusyDialog()
                        return;
                    }
                    try {
                        var response = await that.ajaxCreateWithJQuery("HM_ManageInvoice", {
                            data: oPayload.payload,
                            Items: oPayload.items
                        });
                        const oSelectedCustomerModel = that.getView().getModel("SelectedCustomerModel");
                        oSelectedCustomerModel.setProperty("/InvNo", response.InvoiceNo);
                        var CustomerName = oSelectedCustomerModel.getProperty("/Customer") || oPayload.payload.CustomerName;
                        oSelectedCustomerModel.setProperty("/CustomerName", CustomerName)
                        var Status = oSelectedCustomerModel.getProperty("/Status") || oPayload.payload.Status;
                        oSelectedCustomerModel.setProperty("/Status", Status)
                        that.closeBusyDialog();
                        var oDialog = new sap.m.Dialog({
                            title: that.i18nModel.getText("success"),
                            type: sap.m.DialogType.Message,
                            state: sap.ui.core.ValueState.Success,
                            class: "myUnifiedBtn",
                            content: new sap.m.Text({
                                text: that.i18nModel.getText("invoiceCreatemsg")
                            }),
                            beginButton: new sap.m.Button({
                                text: "OK",
                                type: "Transparent",
                                class: "myUnifiedBtn",
                                press: function() {
                                    oDialog.close();
                                    that.getOwnerComponent().getRouter().navTo("RouteManageInvoice", {
                                        sPath: "TilePage"
                                    });
                                }
                            }),
                            endButton: new sap.m.Button({
                                text: "Generate PDF",
                                type: "Transparent",
                                class: "myUnifiedBtn",
                                press: async () => {
                                    oDialog.close();
                                    await that.CID_onPressGeneratePdf();
                                    that.getOwnerComponent().getRouter().navTo("RouteManageInvoice", {
                                        sPath: "ManageInvoicedetails"
                                    });
                                }
                            }),
                            afterClose: function() {
                                oDialog.destroy();
                            }
                        });
                        oDialog.open();
                    } catch (error) {
                        MessageToast.show(error.responseText || "Submission Failed");
                    }
                } catch (error) {
                    MessageToast.show(that.i18nModel.getText("technicalError"));
                }
            },

            CID_onPressEdit: function() {
                var isEditMode = this.visiablityPlay.getProperty("/editable");
                if (isEditMode) {
                    this.onPressUpdateInvoice();
                } else {
                    this.visiablityPlay.setProperty("/editable", true);
                    this.visiablityPlay.setProperty("/CInvoice", true);
                    // this.byId("CID_id_TableInvoiceItem").setMode("Delete");
                    this.visiablityPlay.setProperty("/addInvBtn", true);
                    this.visiablityPlay.setProperty("/merge", false);
                    this.visiablityPlay.setProperty("/MultiEmail", false);
                    this.visiablityPlay.setProperty("/payByDate", false);
                    this.visiablityPlay.setProperty("/refresh", true);
                }
            },

            CID_onPressLiveChangeEmail: function(oEvent) {
                utils._LCvalidateEmail(oEvent)
            },

            CID_onPressLiveChangeMobileNo: function(oEvent) {
                this.mobileNo = utils._LCvalidateMobileNumber(oEvent);
            },

            CID_onPressLiveChangeGST: function(oEvent) {
                const oInput = oEvent.getSource();
                const sGST = oInput.getValue().toUpperCase();
                const oCustomerModel = this.getView().getModel("SelectedCustomerModel");

                oInput.setValue(sGST);

                // Empty GST → reset
                if (!sGST) {
                    oInput.setValueState("None");
                    oCustomerModel.setProperty("/Type", "");
                    oCustomerModel.setProperty("/Value", "");
                    oCustomerModel.setProperty("/CGSTSelected", false);
                    oCustomerModel.setProperty("/IGSTSelected", false);
                    this.totalAmountCalculation();
                    return;
                }

                // Validate GST format
                if (!utils._LCvalidateGstNumber(oEvent)) {
                    return;
                }

                // First 2 digits = State Code
                const stateCode = sGST.substring(0, 2);

                if (stateCode === "29") {
                    // Karnataka → CGST + SGST
                    oCustomerModel.setProperty("/Type", "CGST/SGST");
                    oCustomerModel.setProperty("/CGSTSelected", true);
                    oCustomerModel.setProperty("/IGSTSelected", false);
                } else {
                    // Other states → IGST
                    oCustomerModel.setProperty("/Type", "IGST");
                    oCustomerModel.setProperty("/CGSTSelected", false);
                    oCustomerModel.setProperty("/IGSTSelected", true);
                }

                // GST is valid → allow percentage entry
                oCustomerModel.setProperty("/GSTValid", true);

                // Keep existing Value if already present
                if (!oCustomerModel.getProperty("/Value")) {
                    oCustomerModel.setProperty("/Value", "");
                }
                this.totalAmountCalculation();
            },

            CI_onSelectCGST: function(oEvent) {
                const bSelected = oEvent.getParameter("selected");
                const oCustomerModel = this.getView().getModel("SelectedCustomerModel");

                if (bSelected) {
                    oCustomerModel.setProperty("/Type", "CGST/SGST");
                    oCustomerModel.setProperty("/Value", "9");
                    oCustomerModel.setProperty("/IGSTSelected", false);
                } else {
                    oCustomerModel.setProperty("/Type", "");
                    oCustomerModel.setProperty("/Value", "18");
                }

                this.totalAmountCalculation();
            },

            CI_onSelectIGST: function(oEvent) {
                const bSelected = oEvent.getParameter("selected");
                const oCustomerModel = this.getView().getModel("SelectedCustomerModel");

                if (bSelected) {
                    oCustomerModel.setProperty("/Type", "IGST");
                    oCustomerModel.setProperty("/Value", "18");
                    oCustomerModel.setProperty("/CGSTSelected", false);
                } else {
                    oCustomerModel.setProperty("/Type", "");
                    oCustomerModel.setProperty("/Value", "");
                }

                this.totalAmountCalculation();
            },

            CI_onPercentageChange: function(oEvent) {
                const sPercentage = parseFloat(oEvent.getParameter("value")) || 0;

                const oView = this.getView();
                const oCustomerModel = oView.getModel("SelectedCustomerModel");

                // Update percentage value only
                oCustomerModel.setProperty("/Value", sPercentage);

                // Recalculate totals
                this.totalAmountCalculation();
            },

            CID_onPressLiveChangePAN: function(oEvent) {
                var oInput = oEvent.getSource();
                utils._LCvalidatePanCard(oEvent)
                if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
            },

            onPressUpdateInvoice: async function() {
                try {
                    // var oModel = this.getView().getModel("FilteredSOWModel").getData();
                    const bIsValid =
                        utils._LCvalidateDate(this.byId("CID_id_NavInvDate"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_InvoiceDesc"), "ID") && this.mobileNo &&
                        utils._LCvalidateEmail(this.byId("CID_id_InputMailID"), "ID") &&
                        (!!this.Discount && !!this.Particulars)

                    if (!bIsValid) {
                        return MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                    }

                    this.getBusyDialog()
                    const oPayload = await this.SubmitPayload("update");

                    if (oPayload === false) {
                        this.closeBusyDialog()
                        return;
                    } else {
                        var Status = oPayload.payload.Status;
                    }
                    try {
                        await this.ajaxUpdateWithJQuery("HM_ManageInvoice", {
                            data: oPayload.payload,
                            filtres: oPayload.filters,
                            Items: oPayload.items
                        });
                        this.visiablityPlay.setProperty("/editable", false);
                        this.visiablityPlay.setProperty("/CInvoice", false);
                        // this.byId("CID_id_TableInvoiceItem").setMode("None");
                        this.visiablityPlay.setProperty("/addInvBtn", false);
                        this.visiablityPlay.setProperty("/refresh", false);
                        this.visiablityPlay.setProperty("/merge", true);
                        this.visiablityPlay.setProperty("/MultiEmail", true);
                        if (Status !== "Payment Received") this.visiablityPlay.setProperty("/payByDate", this.ReminderEmail);
                        if (Status === "Payment Received") {
                            this.visiablityPlay.setProperty("/MultiEmail", false);
                            // this.visiablityPlay.setProperty("/Edit", false);
                        }
                        MessageToast.show(this.i18nModel.getText("invoiceUpdateMess"));
                        this.closeBusyDialog()
                    } catch (error) {
                        this.closeBusyDialog()
                        MessageToast.show(error.responseText || this.i18nModel.getText("invoiceUpdateMessFailed"));
                    }
                } catch (error) {
                    this.closeBusyDialog()
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },

            onChangeInvoiceStatus: function(oEventOrStatus) {
                var that = this;
                var status = "";
                if (that.oDialog) {
                    that.oDialog.destroy();
                    that.oDialog = null;
                }

                if (oEventOrStatus && typeof oEventOrStatus.getSource === "function") {
                    var oSource = oEventOrStatus.getSource();
                    if (typeof oSource.getValue === "function") {
                        status = oSource.getValue();
                        this.visiablityPlay.setProperty("/Form", true);
                        this.visiablityPlay.setProperty("/Table", false);
                    }
                } else if (typeof oEventOrStatus === "string") {
                    status = oEventOrStatus;
                    this.visiablityPlay.setProperty("/Form", false);
                    this.visiablityPlay.setProperty("/Table", true);
                }

                if (status === "Payment Received" || status === "Payment Partially" || status === "Open") {
                    var oView = that.getView();
                    if (!that.oDialog) {
                        sap.ui.core.Fragment.load({
                            name: "sap.ui.com.project1.fragment.ManageInvoice",
                            controller: that
                        }).then(function(oDialog) {
                            that.oDialog = oDialog;
                            oView.addDependent(oDialog);
                            oDialog.open();
                            that.modelFunction();
                        });
                    } else {
                        that.oDialog.open();
                        that.modelFunction();
                    }
                }
            },

            modelFunction: function() {
                var oNavigationModel = this.getView().getModel("SelectedCustomerModel").getData();

                var fTotalAmount = parseFloat(oNavigationModel.TotalAmount) || 0;
                var fPaidAmount = parseFloat(oNavigationModel.PaidAmount) || 0;

                var oInvoicePaymentModel = this.getView().getModel("InvoicePayment");

                var fAllReceivedAmount = 0;
                var fBackendDueAmount = null;

                if (oInvoicePaymentModel && oInvoicePaymentModel.getData()) {
                    fAllReceivedAmount = parseFloat(oInvoicePaymentModel.getProperty("/AllReceivedAmount")) || 0;

                    var tempDue = parseFloat(oInvoicePaymentModel.getProperty("/AllDueAmount"));
                    if (!isNaN(tempDue)) {
                        fBackendDueAmount = tempDue;
                    }
                }

                var fTotalReceived = fPaidAmount + fAllReceivedAmount; // Total received

                var fCalculatedDue = fTotalAmount - fTotalReceived;
                if (fCalculatedDue < 0) {
                    fCalculatedDue = 0;
                }

                var fFinalDue;
                if (fTotalAmount > fAllReceivedAmount) {
                    fFinalDue = fCalculatedDue;
                } else {
                    fFinalDue = (fBackendDueAmount !== null) ? fBackendDueAmount : fCalculatedDue;
                }

                var oModel = new sap.ui.model.json.JSONModel({
                    InvNo: oNavigationModel.InvNo,
                    TransactionId: "",
                    ReceivedDate: "",
                    ReceivedAmount: "",
                    TotalAmount: fTotalAmount.toFixed(2),
                    DueAmount: fFinalDue.toFixed(2),
                    Currency: oNavigationModel.Currency,
                    ConversionRate: "",
                    AmountInINR: "",
                    FlagVisCompany: "Company Invoice",
                    CustomerName: oNavigationModel.CustomerName,
                    BookingID: oNavigationModel.BookingID,
                    BranchCode: oNavigationModel.BranchCode
                });
                this.getView().setModel(oModel, "PaymentModel");
            },

            CID_onPressDisplayPaymentDetail: function() {
                this.onChangeInvoiceStatus("Open");
                this.visiablityPlay.setProperty("/Form", false);
                this.visiablityPlay.setProperty("/Table", true);
            },

            onChangeReceivedAmount: function(oEvent) {
                var paymentModel = this.getView().getModel("PaymentModel");
                var allPaymentData = this.getView().getModel("InvoicePayment");
                var oNavigationModel = this.getView().getModel("SelectedCustomerModel").getData();

                var totalReceivedAmount = 0;
                if (allPaymentData) {
                    totalReceivedAmount = parseFloat(allPaymentData.getProperty("/AllReceivedAmount")) || 0;
                }

                var paidAmount = parseFloat(oNavigationModel.PaidAmount) || 0;

                var sValue = paymentModel.getProperty("/ReceivedAmount") || "";
                sValue = sValue.replaceAll(',', '');
                paymentModel.setProperty("/ReceivedAmount", sValue);

                var totalAmount = parseFloat(paymentModel.getProperty("/TotalAmount")) || 0;
                var receivedAmount = parseFloat(sValue) || 0;

                var totalPaidTillNow = paidAmount + totalReceivedAmount + receivedAmount;

                var dueAmount = totalAmount - totalPaidTillNow;
                if (dueAmount < 0) {
                    dueAmount = 0;
                }

                paymentModel.setProperty("/DueAmount", dueAmount.toFixed(2));
                this.onChangePaymentConvertionRate();

                if (oEvent) {
                    var enteredAmount = parseFloat(oEvent.getParameter("value").replaceAll(',', '')) || 0;

                    var remainingDue = totalAmount - (paidAmount + totalReceivedAmount);

                    this.ResivedAmount = true;

                    if (enteredAmount === remainingDue) {
                        sap.ui.getCore().byId("idReceivedAmount").setValueState("None");
                    } else if (enteredAmount > remainingDue) {
                        this.ResivedAmount = false;
                        sap.ui.getCore().byId("idReceivedAmount").setValueState("Error");
                        sap.ui.getCore().byId("idReceivedAmount")
                            .setValueStateText(this.i18nModel.getText("invoiceRecievedAmountMessage"));
                    } else {
                        sap.ui.getCore().byId("idReceivedAmount").setValueState("None");
                        this.ResivedAmount = true;
                        utils._LCvalidateAmountZeroTaking(oEvent);
                    }
                }
            },

            onChangePaymentConvertionRate: function(oEvent) {
                if (oEvent) utils._LCvalidateAmount(oEvent);
                var oModelData = this.getView().getModel("PaymentModel");
                var receivedAmount = parseFloat(oModelData.getData().ReceivedAmount) || 0;
                var conversionRate = parseFloat(oModelData.getData().ConversionRate) || 0;
                var AmountInINR = receivedAmount * conversionRate;
                (isNaN(AmountInINR)) ? oModelData.setProperty("/AmountInINR", '0.00'): oModelData.setProperty("/AmountInINR", AmountInINR.toFixed(2));
            },

            Readcall: async function(entity, filterValue) {
                const oData = await this.ajaxReadWithJQuery(entity, filterValue);
                if (entity === "ManageInvoice") {
                    const invoiceData = oData.data?.[0] || {};
                    invoiceData.InvoiceDate = this.Formatter.formatDate(invoiceData.InvoiceDate);
                    invoiceData.PayByDate = this.Formatter.formatDate(invoiceData.PayByDate);
                    this.getView().setModel(new JSONModel(invoiceData), "SelectedCustomerModel");
                    this.Status = invoiceData.Status;
                    return;
                }

                const view = this.getView();
                view.setModel(new JSONModel(oData.data), "InvoicePayment");
                view.setModel(new JSONModel({
                    InvoicePaymentDetail: oData.data
                }), "PaymentDetailModel");

                const items = oData.data || [];

                // Case 1: Only 1 record and Used = X → skip calculation
                if (items.length === 1 && items[0].Used === "X") {
                    return;
                }

                const validItems = items.filter(item => item.Used !== "X");

                // Sum of post-invoice payments
                const totalReceivedAmount = validItems.reduce(
                    (sum, item) => sum + (parseFloat(item.ReceivedAmount) || 0),
                    0
                );

                // Safe TotalAmount fetch
                const totalAmount = parseFloat(
                    validItems[0]?.TotalAmount || items[0]?.TotalAmount || 0
                );

                // PaidAmount (advance)
                const oNavigationModel = view.getModel("SelectedCustomerModel")?.getData() || {};
                const paidAmount = parseFloat(oNavigationModel.PaidAmount) || 0;

                // FINAL CALCULATION
                const totalPaid = paidAmount + totalReceivedAmount;

                let totalDueAmount = totalAmount - totalPaid;
                if (totalDueAmount < 0) {
                    totalDueAmount = 0;
                }

                const invoiceModel = view.getModel("InvoicePayment");
                invoiceModel.setProperty("/AllReceivedAmount", totalReceivedAmount.toFixed(2));
                invoiceModel.setProperty("/AllDueAmount", totalDueAmount.toFixed(2));
                invoiceModel.refresh(true);
            },

            onChangePaymentRecived: async function() {
                var paymentModel = this.getView().getModel("PaymentModel").getData();
                const isMandatoryValid =
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MI_id_TransactionID"), "ID") &&
                    utils._LCvalidateDate(sap.ui.getCore().byId("idReceivedDate"), "ID");

                let isCurrencyValid = true;
                if (paymentModel.Currency !== "INR") {
                    isCurrencyValid = utils._LCvalidateAmount(sap.ui.getCore().byId("idFrgConvertionRate"), "ID");
                }

                var receivedAmount = parseFloat((paymentModel.ReceivedAmount || "0").replaceAll(',', ''));
                var isReceivedAmountInvalid = isNaN(receivedAmount) || receivedAmount <= 0;

                if (isReceivedAmountInvalid) {
                    sap.ui.getCore().byId("idReceivedAmount").setValueState("Error")
                        .setValueStateText(this.i18nModel.getText("invoiceRecievedAmountMessage"));
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }

                const isValid = isMandatoryValid && isCurrencyValid && this.ResivedAmount;
                if (!isValid) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }

                if (Number(paymentModel.DueAmount) < 0) {
                    MessageToast.show(this.i18nModel.getText("dueAmountZeroOrNegative"));
                    return;
                }

                this.getBusyDialog()
                const jsonData = {
                    InvNo: String(paymentModel.InvNo),
                    TransactionId: String(paymentModel.TransactionId),
                    ReceivedDate: paymentModel.ReceivedDate ? paymentModel.ReceivedDate.split("/").reverse().join("-") : "",
                    ReceivedAmount: String(paymentModel.ReceivedAmount),
                    TotalAmount: String(paymentModel.TotalAmount),
                    DueAmount: String(paymentModel.DueAmount),
                    Currency: String(paymentModel.Currency),
                    ConversionRate: paymentModel.Currency !== "INR" ? String(paymentModel.ConversionRate) : "",
                    AmountInINR: paymentModel.Currency !== "INR" ? String(paymentModel.AmountInINR) : "",
                    CustomerName: paymentModel.CustomerName,
                    BookingID: paymentModel.BookingID,
                    BranchCode: paymentModel.BranchCode,
                    PaymentType: "UPI"
                };

                try {
                    const oData = await this.ajaxCreateWithJQuery("HM_InvoicePaymentDetail", {
                        data: jsonData
                    });

                    if (oData && oData.success) {
                        this.oDialog.close();
                        await this.Readcall("HM_ManageInvoice", {
                            InvNo: this.decodedPath
                        });
                        await this.Readcall("HM_InvoicePaymentDetail", {
                            InvNo: this.decodedPath
                        });
                        const hasDue = parseFloat(paymentModel.DueAmount) > 0;
                        this.visiablityPlay.setProperty("/payByDate", hasDue ? this.ReminderEmail : false);
                        this.visiablityPlay.setProperty("/MultiEmail", hasDue);
                        this.visiablityPlay.setProperty("/Edit", hasDue);
                        this.visiablityPlay.setProperty("/editable", false);
                        this.visiablityPlay.setProperty("/CInvoice", false);
                        this.visiablityPlay.setProperty("/merge", true);
                        this.visiablityPlay.setProperty("/addInvBtn", false);
                        this.visiablityPlay.setProperty("/refresh", false);

                        if (this.oDialog) {
                            this.oDialog.destroy();
                            this.oDialog = null;
                        }

                        // this.byId("CID_id_TableInvoiceItem").setMode("None");
                        MessageToast.show(this.i18nModel.getText("paymentMessage"));
                    }
                } catch (error) {
                    MessageToast.show(error.responseText);
                } finally {
                    this.closeBusyDialog()
                }
            },

            onPressInvClose: function() {
                sap.ui.getCore().byId("MI_id_TransactionID").setValueState("None");
                sap.ui.getCore().byId("idReceivedAmount").setValueState("None");
                sap.ui.getCore().byId("idFrgConvertionRate").setValueState("None");

                if (this.oDialog) {
                    this.oDialog.close();
                    this.oDialog.destroy(true);
                    this.oDialog = null;
                }
            },

            onLiveTransactionID: function(oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            onPaymentModeChange: function(oEvent) {
                utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
            },

            onReceivedDateDatePickerChange: function(oEvent) {
                utils._LCvalidateDate(oEvent);
            },

            CID_ValidateCommonFields: function(oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            CID_CurrencyChanges: function(oEvent) {
                if (oEvent.getSource().getValue() !== "INR") {
                    this.byId("idSAC").setVisible(false);
                    this.byId("idGSTCalculation").setVisible(false);
                    // this.visiablityPlay.setProperty("/TDS", false);
                } else {
                    this.byId("idSAC").setVisible(true);
                    this.byId("idGSTCalculation").setVisible(true);
                    // this.visiablityPlay.setProperty("/TDS", true);
                }
                this.visiablityPlay.refresh(true);
                this.totalAmountCalculation();
            },

            CD_onDiscountInfoPress: function(oEvent) {
                if (!this._oPopover) {
                    this._oPopover = new sap.m.Popover({
                        contentWidth: "400px",
                        contentHeight: "auto",
                        showHeader: false,
                        placement: sap.m.PlacementType.Bottom,
                        content: [
                            new sap.m.VBox({
                                alignItems: "Center",
                                justifyContent: "Center",
                                width: "100%",
                                items: [
                                    new sap.m.Text({
                                        text: this.i18nModel.getText("discountInfoText"),
                                        wrapping: true
                                    })
                                ]
                            }).addStyleClass("customPopoverContent")
                        ]
                    });
                    this.getView().addDependent(this._oPopover);
                }
                this._oPopover.openBy(oEvent.getSource());
            },

            CID_onPressDelete: function() {
                var that = this;
                var oTable = this.byId("CID_id_TableInvoiceItem");
                var oModel = this.getView().getModel("ManageInvoiceItemModel");

                var aSelectedItems = oTable.getSelectedItems();

                //  No selection
                if (!aSelectedItems.length) {
                    MessageToast.show(this.i18nModel.getText("pleaseselectonlyonerowtoDelete"));
                    return;
                }

                //  More than one selected
                if (aSelectedItems.length > 1) {
                    MessageToast.show(this.i18nModel.getText("pleaseselectonlyonerowtoDelete"));
                    return;
                }

                //  Single selected item
                var oSelectedItem = aSelectedItems[0];
                var oContext = oSelectedItem.getBindingContext("ManageInvoiceItemModel");
                var oObject = oContext.getObject();

                var sPath = oContext.getPath(); // /ManageInvoiceItem/2
                var iIndex = parseInt(sPath.split("/")[2], 10);

                var aData = oModel.getProperty("/ManageInvoiceItem");

                var fnDeleteLocal = function() {
                    aData.splice(iIndex, 1);

                    // Re-index
                    aData.forEach(function(item, idx) {
                        item.IndexNo = idx + 1;
                    });

                    oModel.setProperty("/ManageInvoiceItem", aData);
                    oTable.removeSelections(true);

                    that.SNoValue = aData.length;
                    that.totalAmountCalculation();

                    MessageToast.show(that.i18nModel.getText("ManageInvoiceDeleteSuccess"));
                };

                // 🔁 If already saved → backend delete
                if (oObject.ItemID) {
                    this.showConfirmationDialog(
                        that.i18nModel.getText("msgBoxConfirm"),
                        that.i18nModel.getText("msgBoxConfirmDelete"),
                        function() {
                            that.getBusyDialog();

                            that.ajaxDeleteWithJQuery("/HM_ManageInvoiceItem", {
                                filters: {
                                    ItemID: oObject.ItemID
                                }
                            }).then(function() {
                                fnDeleteLocal();
                                that.closeBusyDialog();
                            }).catch(function(error) {
                                that.closeBusyDialog();
                                MessageToast.show(error.responseText);
                            });
                        }
                    );
                }
                //  Not saved yet → local delete only
                else {
                    fnDeleteLocal();
                }
            },

            CID_onPressSendEmail: function(oEvent) {
                var that = this;
                that.loginModel.setProperty("/RichText", true);
                that.loginModel.setProperty("/SimpleForm", false);

                var modelData = that.getView().getModel("SelectedCustomerModel").getData();
                var receivedAmount = this.getView().getModel("InvoicePayment").getProperty("/AllReceivedAmount");
                var dueAmount = this.getView().getModel("InvoicePayment").getProperty("/AllDueAmount");

                var oUploaderDataModel = new JSONModel({
                    isEmailValid: true,
                    ToEmail: modelData.CustomerEmail,
                    ToName: modelData.CustomerName,
                    CCEmail: "",
                    name: "",
                    mimeType: "",
                    content: "",
                    isFileUploaded: false,
                    button: true,
                    Subject: `STAYVRIKSHA - INVOICE PAYMENT REMINDER`,
                    htmlbody: `
                        <p>Dear ${modelData.CustomerName},</p>

                        <p>I hope you are doing well. This is a kind reminder that the payment for the hostel invoice <b>${modelData.InvNo}</b>, issued on <b>${modelData.InvoiceDate}</b>, is still pending. Please review the invoice details below:</p>

                        <ul>
                            <li><b>Invoice No:</b> ${modelData.InvNo}</li>
                            <li><b>Due Date:</b> ${modelData.PayByDate}</li>
                            <li><b>Invoice Amount:</b> ${this.Formatter.fromatNumber(modelData.TotalAmount)} ${modelData.Currency}</li>
                            <li><b>Received Amount:</b> ${this.Formatter.fromatNumber(receivedAmount)} ${modelData.Currency}</li>
                            <li><b>Pending Amount:</b> ${this.Formatter.fromatNumber(dueAmount)} ${modelData.Currency}</li>
                            <li><b>Description:</b> ${modelData.InvoiceDescription}</li>
                        </ul>

                        <p>We request you to kindly process the payment at the earliest. If payment has already been completed, please disregard this email.</p>

                        <p>If you have any questions or require further clarification, feel free to reach out to us.</p>

                        <p>Thank you for your cooperation.</p>
                        <br>
                        <p style="margin:0;">Warm Regards,</p>
                        <p style="margin:0;">Accounts & Finance Team</p>
                        <p style="margin:0;">StayVriksha</p>
                    `
                });
                this.getView().setModel(oUploaderDataModel, "UploaderData");
                this.EOD_commonOpenDialog("sap.ui.com.project1.fragment.CommonMail", true);
            },

            CID_onPressSendMultipalEmail: function() {
                var that = this;
                that.loginModel.setProperty("/RichText", true);
                that.loginModel.setProperty("/SimpleForm", true);
                var modelData = that.getView().getModel("SelectedCustomerModel").getData();
                // that.getView().getModel("TextDisplay").setProperty("/name", "");

                var oUploaderDataModel = new JSONModel({
                    isEmailValid: true,
                    ToEmail: modelData.CustomerEmail,
                    ToName: modelData.CustomerName,
                    CCEmail: "",
                    name: "",
                    mimeType: "",
                    content: "",
                    isFileUploaded: false,
                    button: false,
                    Subject: `${modelData.CustomerName} - ${modelData.InvoiceDescription}`,
                    htmlbody: `<p>Dear Finance Team,</p>
                    <p>Please find the following invoice details below:</p>
                    <li><b>Invoice No : ${modelData.InvNo}</b></li>
                    <li><b>Invoice Date : ${modelData.InvoiceDate}</b></li>
                    <li><b>Total Amount : ${this.Formatter.fromatNumber(modelData.TotalAmount)} ${modelData.Currency}</b></li>
                    <li><b>Description : ${modelData.InvoiceDescription}</b></li>

                    <p>If you have any questions or require further information, please do not hesitate to contact us.</p>
                   <p style="margin: 0;">Best Regards,</p>
                   <p style="margin: 0;">Nikhil Shah,</p>
                   <p style="margin: 0;">Accountant Manager</p>
                   `
                });
                this.getView().setModel(oUploaderDataModel, "UploaderData");
                this.EOD_commonOpenDialog("sap.ui.com.project1.fragment.CommonMail", false);
                this.validateSendButton();
            },

            Mail_onPressClose: function() {
                this.loginModel.setProperty("/RichText", false);
                this.loginModel.setProperty("/SimpleForm", true);
                this.EOU_oDialogMail.close();
                this.EOU_oDialogMail.destroy(true);
                this.EOU_oDialogMail = null
            },

            EOD_commonOpenDialog: async function(fragmentName, value) {
                if (!this.EOU_oDialogMail) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(function(EOU_oDialogMail) {
                        this.EOU_oDialogMail = EOU_oDialogMail;
                        this.getView().addDependent(this.EOU_oDialogMail);
                        this.EOU_oDialogMail.open();
                        if (value === true) sap.ui.getCore().byId("SendMail_Button").setEnabled(true);
                    }.bind(this));
                } else {
                    this.EOU_oDialogMail.open();
                    if (value === true) sap.ui.getCore().byId("SendMail_Button").setEnabled(true);
                }
            },

            Mail_onUpload: function(oEvent) {
                this.handleFileUpload(
                    oEvent,
                    this, // context
                    "UploaderData", // model name
                    "/attachments", // path to attachment array
                    "/name", // path to comma-separated file names
                    "/isFileUploaded", // boolean flag path
                    "uploadSuccessfull", // i18n success key
                    "fileAlreadyUploaded", // i18n duplicate key
                    "noFileSelected", // i18n no file selected
                    "fileReadError", // i18n file read error
                    () => this.validateSendButton()
                );
            },

            //Mail dialog button visibility
            validateSendButton: function() {
                const sendBtn = sap.ui.getCore().byId("SendMail_Button");
                const uploaderModel = this.getView().getModel("UploaderData");

                if (!sendBtn || !uploaderModel) {
                    return;
                }

                const isFileUploaded = uploaderModel.getProperty("/isFileUploaded") === true;
                sendBtn.setEnabled(isFileUploaded);
            },

            Mail_onEmailChange: function() {
                this.validateSendButton();
            },

            //Send mail
            Mail_onSendEmail: function() {
                try {
                    var oModel = this.getView().getModel("UploaderData").getData();
                    if (this.loginModel.getProperty("/SimpleForm")) {
                        if (!oModel.attachments || oModel.attachments.length === 0) {
                            MessageToast.show(this.i18nModel.getText("attachmentRequired")); // Or a hardcoded string: "Please add at least one attachment."
                            return;
                        }
                    }
                    var SelectedModel = this.getView().getModel("SelectedCustomerModel");
                    var oPayload = {
                        "InvNo": SelectedModel.getData().InvNo,
                        "toEmailID": oModel.ToEmail,
                        "toName": oModel.ToName,
                        "subject": oModel.Subject,
                        "body": oModel.htmlbody,
                        "CCEmailId": oModel.CCEmail,
                        "attachments": oModel.attachments
                    };
                    this.getBusyDialog()
                    this.ajaxCreateWithJQuery("CompanyInvoiceEmail", oPayload).then((oData) => {
                        MessageToast.show(this.i18nModel.getText("emailSuccess"));
                        this.closeBusyDialog()
                        SelectedModel.setProperty("/Status", "Invoice Sent");
                        SelectedModel.refresh(true);
                        this.loginModel.setProperty("/RichText", false);
                        this.loginModel.setProperty("/SimpleForm", true);
                    }).catch((error) => {
                        this.closeBusyDialog()
                        MessageToast.show(error.responseText);
                    });
                    this.Mail_onPressClose();
                } catch (error) {
                    this.closeBusyDialog()
                    MessageToast.show(error.responseText);
                }
            },

            onIncomeTaxPercentageInputLiveChange: function(oEvent) {
                utils._LCvalidateVariablePay(oEvent);
                const oNavigationModel = this.getView().getModel("SelectedCustomerModel");
                const oNavigationData = oNavigationModel.getData();

                if (oNavigationData.Currency === "INR") {
                    const subTotalInGST = parseFloat(oNavigationData.SubTotalInGST) || 0;
                    const subTotalNotGST = parseFloat(oNavigationData.SubTotalNotGST) || 0;
                    const incomePerc = parseFloat(oNavigationData.IncomePerc) || 0;

                    const total = subTotalInGST + subTotalNotGST;
                    const tds = ((total * incomePerc) / 100).toFixed(2);
                    oNavigationModel.setProperty("/IncomeTax", Math.round(tds));
                }
            },

            CID_onPressGeneratePdf: async function() {
                try {
                    this.getBusyDialog()
                    const {
                        jsPDF
                    } = window.jspdf;
                    const oView = this.getView();
                    const oModel = oView.getModel("SelectedCustomerModel").getData();
                    const oManageInvoiceItemModel = oView.getModel("ManageInvoiceItemModel").getData();
                    const oCompanyItemModel = oManageInvoiceItemModel.ManageInvoiceItem || [];
                    var data = this.getView().getModel("FilteredSOWModel").getData();

                    // fetch company details
                    let filter = {
                        BranchID: [oModel.BranchCode]
                    };
                    const oCompanyDetailsModel = await this.ajaxReadWithJQuery("HM_Branch", filter);
                    const companyImage = oCompanyDetailsModel.data[0].Photo1;

                    let paymentTermsFilter = {
                        InvNo: [oModel.InvNo]
                    };
                    const paymentdata = await this.ajaxReadWithJQuery("HM_Payment", paymentTermsFilter);

                    let totalInWords = await this.convertNumberToWords(oModel.TotalAmount, data.Currency);
                    const showSAC = oModel.GSTNO !== undefined && oModel.GSTNO !== "";

                    const margin = 15;
                    const doc = new jsPDF({
                        orientation: "portrait",
                        unit: "mm",
                        format: "a4"
                    });

                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const usableWidth = pageWidth - 2 * margin;
                    let currentY = 0;

                    // Header
                    let headerMargin = 25.4;
                    doc.setFontSize(14).setFont("times", "bold");
                    if (oModel.Status === "Payment Received") {
                        doc.text("TAX - INVOICE", pageWidth - 18, headerMargin, {
                            align: "right"
                        });
                    } else {
                        doc.text("DRAFT INVOICE", pageWidth - 18, headerMargin, {
                            align: "right"
                        });
                    }

                    if (companyImage && companyImage.trim() !== "") {
                        const imgData = "data:image/png;base64," + companyImage;
                        doc.addImage(imgData, "PNG", margin, 15, 40, 40);
                    }

                    // Invoice Details
                    const detailsStartY = 35;
                    const rowHeight = 6.5;
                    const columnWidths = [30, 30];
                    const rightAlignX = pageWidth - 22 - columnWidths[0] - columnWidths[1];

                    doc.setFontSize(12).setFont("times", "bold");

                    const detailsTable = [{
                            label: 'Invoice No. :',
                            value: oModel.InvNo
                        },
                        {
                            label: 'Date :',
                            value: typeof oModel.InvDate === "string" ? oModel.InvDate : Formatter.formatDate(oModel.InvDate)
                        },
                        {
                            label: 'Room No :',
                            value: oModel.RoomNo
                        }
                    ];

                    currentY = detailsStartY;
                    detailsTable.forEach(row => {
                        doc.text(row.label, rightAlignX + columnWidths[0] - doc.getTextWidth(row.label), currentY + 5);
                        doc.text(String(row.value), rightAlignX + columnWidths[0] + 5, currentY + 5);
                        currentY += rowHeight;
                    });

                    currentY += 15;
                    doc.setFont("times", "bold").setFontSize(11);
                    doc.text("To,", margin, currentY);

                    currentY += 5;
                    doc.setFont("times", "normal").setFontSize(12);

                    // Customer details
                    if (oModel.CustomerName) {
                        doc.text(`Name : ${oModel.CustomerName}`, margin, currentY);
                        currentY += 5;
                    }

                    if (oModel.PermanentAddress) {
                        const ConsultantAddressLines = doc.splitTextToSize(oModel.PermanentAddress, usableWidth / 2 - 10);
                        doc.text(ConsultantAddressLines, margin, currentY);
                        currentY += ConsultantAddressLines.length * 5;
                    }

                    if (oModel.MobileNo) {
                        doc.text(`Mobile No : ${oModel.MobileNo}`, margin, currentY);
                        currentY += 5;
                    }
                    if (oModel.CustomerEmail) {
                        doc.text(`Email : ${oModel.CustomerEmail}`, margin, currentY);
                        currentY += 5;
                    }

                    if (oModel.CustomerGSTNO) {
                        doc.text(`GSTIN : ${oModel.CustomerGSTNO}`, margin, currentY);
                        currentY += 5;
                    }

                    currentY += 5;

                    // ===== TABLE BODY =====
                    const body = oCompanyItemModel.filter(item => item).map((item, index) => {
                        const row = [
                            index + 1,
                            item.Particulars,
                            (item.StartDate) || "",
                            (item.EndDate) || "",
                            Formatter.fromatNumber(item.GrossPrice) || "0.00",
                            item.UnitText,
                            Formatter.fromatNumber(item.Total) || "0.00"
                        ];
                        if (showSAC) row.splice(2, 0, item.SAC);
                        return row;
                    });

                    const head = showSAC ? [
                        ['Sl.No.', 'Particulars', 'SAC', 'Start Date', 'End Date', 'Gross Price', 'Unit Text', 'Total']
                    ] : [
                        ['Sl.No.', 'Particulars', 'Start Date', 'End Date', 'Gross Price', 'Unit Text', 'Total']
                    ];

                    doc.autoTable({
                        startY: currentY,
                        head: head,
                        body: body,
                        theme: 'grid',
                        pageBreak: 'auto',
                        rowPageBreak: 'auto',
                        headStyles: {
                            fillColor: [20, 170, 183]
                        },
                        styles: {
                            font: "times",
                            fontSize: 10,
                            cellPadding: 3,
                            lineWidth: 0.5,
                            lineColor: [30, 30, 30],
                            halign: "center"
                        },
                        columnStyles: {
                            0: {
                                halign: 'center'
                            },
                            1: {
                                halign: 'left'
                            },
                            ...(showSAC ? {
                                2: {
                                    halign: 'center'
                                },
                                3: {
                                    halign: 'right'
                                },
                                4: {
                                    halign: 'right'
                                },
                                5: {
                                    halign: 'right'
                                },
                                6: {
                                    halign: 'right'
                                },
                                7: {
                                    halign: 'right'
                                }
                            } : {
                                2: {
                                    halign: 'center'
                                },
                                3: {
                                    halign: 'right'
                                },
                                4: {
                                    halign: 'right'
                                },
                                5: {
                                    halign: 'right'
                                },
                                6: {
                                    halign: 'right'
                                }
                            })
                        },
                    });

                    currentY = doc.lastAutoTable.finalY + 5;

                    if (currentY + 40 > pageHeight) {
                        doc.addPage();
                        currentY = 20;
                    }

                    // ===== SUMMARY TABLE =====
                    const summaryBody = [];

                    if (parseFloat(oModel.SubTotalNotGST) > 0) {
                        summaryBody.push([`Sub-Total ( Non-Taxable ) (${data.Currency}) :`,
                            Formatter.fromatNumber(parseFloat(oModel.SubTotalNotGST))
                        ]);
                    }

                    if (parseFloat(oModel.SubTotalInGST) > 0) {
                        summaryBody.push([
                            `Sub-Total ( Taxable ) (${data.Currency}) :`,
                            Formatter.fromatNumber(parseFloat(oModel.SubTotalInGST))
                        ]);
                    }

                    if (parseFloat(oModel.CouponDiscount) > 0) {
                        summaryBody.push([
                            `Discount (${oModel.CouponCode}) :`,
                            "- " + Formatter.fromatNumber(parseFloat(oModel.CouponDiscount))
                        ]);
                    }

                    if (data.Currency !== "USD" && oModel.Type) {
                        const percentageText = oModel.Value && oModel.Value !== "0" ? `(${oModel.Value}%)` : "";

                        const cgstValue = parseFloat(oModel.CGST);
                        const sgstValue = parseFloat(oModel.SGST);
                        const igstValue = parseFloat(oModel.IGST);

                        if (data.Currency === "INR" && oModel.Type === "CGST/SGST" && cgstValue) {
                            summaryBody.push([`CGST ${percentageText} :`, Formatter.fromatNumber(cgstValue.toFixed(2))]);
                            summaryBody.push([`SGST ${percentageText} :`, Formatter.fromatNumber(sgstValue.toFixed(2))]);
                        }

                        if (data.Currency === "INR" && oModel.Type === "IGST" && igstValue) {
                            summaryBody.push([`IGST ${percentageText} :`, Formatter.fromatNumber(igstValue.toFixed(2))]);
                        }
                    }

                    // if (parseFloat(oModel.RefundAmount) > 0) {
                    //     summaryBody.push([
                    //         `Refund Due (${data.Currency}) :`,
                    //         Formatter.fromatNumber(parseFloat(oModel.RefundAmount))
                    //     ]);
                    // }

                    // if (parseFloat(oModel.RefundProcessed) > 0) {
                    //     summaryBody.push([
                    //         `Refund Processed (${data.Currency}) :`,
                    //         Formatter.fromatNumber(parseFloat(oModel.RefundProcessed))
                    //     ]);
                    // }

                    const roundOff = Number(data.RoundOf);
                    if (!isNaN(roundOff) && roundOff !== 0) {
                        summaryBody.push([`Round Off (${data.Currency}) :`, data.RoundOf]);
                    }

                    // if (data.RoundOf && data.RoundOf !== "0") {
                    //     summaryBody.push([`Round Off (${data.Currency}) :`, data.RoundOf]);
                    // }

                    const totalRowIndex = summaryBody.length;
                    summaryBody.push([`Total (${data.Currency}) :`, Formatter.fromatNumber(parseFloat(oModel.TotalAmount))]);

                    doc.autoTable({
                        startY: currentY,
                        head: [],
                        body: summaryBody,
                        theme: 'plain',
                        pageBreak: 'auto',
                        rowPageBreak: 'auto',
                        styles: {
                            font: "times",
                            fontSize: 10,
                            halign: "right",
                            cellPadding: 2,
                            overflow: "ellipsize"
                        },
                        columnStyles: {
                            0: {
                                halign: "right",
                                cellWidth: 60
                            },
                            1: {
                                halign: "right",
                                cellWidth: 40
                            }
                        },
                        margin: {
                            left: 95
                        },
                        didParseCell: function(data) {
                            if (data.row.index === totalRowIndex) {
                                data.cell.styles.lineWidth = {
                                    top: 0.5,
                                    right: 0,
                                    bottom: 0,
                                    left: 0
                                };
                                data.cell.styles.lineColor = [0, 0, 0];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    });

                    currentY = doc.lastAutoTable.finalY + 10;

                    // ===== AMOUNT IN WORDS =====
                    oModel.AmountInWords = totalInWords;
                    doc.setFont("times", "bold");
                    doc.text("Amount in Words :", margin, currentY);

                    currentY += 5;
                    doc.setFont("times", "normal");

                    const amountLines = doc.splitTextToSize(
                        oModel.AmountInWords || "",
                        usableWidth
                    );
                    doc.text(amountLines, margin, currentY);

                    // Move Y below wrapped text
                    currentY += amountLines.length * 5 + 8;

                    // ===== Transaction History =====
                    if (paymentdata && paymentdata.commentData && paymentdata.commentData.length > 0) {

                        // Page break check
                        if (currentY + 60 > pageHeight) {
                            doc.addPage();
                            currentY = 20;
                        }

                        doc.setFont("times", "bold").setFontSize(11);
                        doc.text("Transaction History", margin, currentY);

                        currentY += 5;

                        const paymentBody = paymentdata.commentData.map((item, index) => ([
                            index + 1,
                            Formatter.formatDate(item.Date),
                            item.PaymentType || "",
                            item.BankName || "",
                            item.BankTransactionID || "-",
                            Formatter.fromatNumber(item.Amount),
                            item.Currency || ""
                        ]));

                        doc.autoTable({
                            startY: currentY,
                            head: [
                                ['Sl.No', 'Date', 'Payment Type', 'Bank / Mode', 'Transaction ID', 'Amount', 'Currency']
                            ],
                            body: paymentBody,
                            theme: 'grid',
                            pageBreak: 'auto',
                            rowPageBreak: 'auto',
                            headStyles: {
                                fillColor: [20, 170, 183]
                            },
                            styles: {
                                font: "times",
                                fontSize: 10,
                                cellPadding: 3,
                                lineWidth: 0.5,
                                lineColor: [30, 30, 30],
                                halign: "center"
                            },
                            columnStyles: {
                                1: {
                                    halign: "center"
                                },
                                2: {
                                    halign: "left"
                                },
                                3: {
                                    halign: "left"
                                },
                                4: {
                                    halign: "left"
                                },
                                5: {
                                    halign: "right"
                                }
                            }
                        });

                        currentY = doc.lastAutoTable.finalY + 8;
                    }

                    currentY += 15;

                    // Page break check
                    if (currentY + 20 > pageHeight) {
                        doc.addPage();
                        currentY = 20;
                    }
                    doc.setFontSize(11);
                    doc.text("Thank you for staying with us.", margin - 2, currentY);

                    const totalPages = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        doc.setPage(i);
                        this.addFooter(doc, oCompanyDetailsModel, pageWidth, pageHeight, i, totalPages);
                    }

                    doc.save(`${oModel.CustomerName}-${oModel.InvNo}-Invoice.pdf`);
                } catch (error) {
                    this.closeBusyDialog()
                    MessageToast.show(error.message || error.responseText);
                } finally {
                    this.closeBusyDialog()
                }
            },

            addFooter: function(doc, oCompanyDetailsModel, pageWidth, pageHeight, currentPage, totalPages) {
                const footerHeight = 18;
                const footerYPosition = pageHeight - footerHeight;
                const footerWidth = pageWidth;

                const company = oCompanyDetailsModel.data[0];

                // Grey footer background
                doc.setFillColor(128, 128, 128);
                doc.rect(0, footerYPosition, footerWidth, footerHeight, 'F');

                doc.setFont("helvetica", "normal");
                doc.setTextColor(255, 255, 255); // White text

                const textYPosition = footerYPosition + 5;
                const lineHeight = 5;
                let currentYPosition = textYPosition;

                // Jurisdiction line
                if (company && company.City) {
                    doc.setFontSize(8);
                    doc.text(`SUBJECT TO ${company.City.toUpperCase()} JURISDICTION`, footerWidth / 2, currentYPosition, {
                        align: 'center'
                    });
                    currentYPosition += lineHeight;
                }

                // GSTIN
                if (company && company.GSTIN) {
                    doc.setFontSize(10);
                    doc.text(`GSTIN : ${company.GSTIN}`, footerWidth - 5, currentYPosition, {
                        align: 'right'
                    });
                }

                if (company && company.Address) {
                    doc.setFontSize(10);

                    // Combine address + mobile at the end
                    let fullAddress = company.Address;
                    if (company.Contact) {
                        fullAddress += `, Mobile No : ${company.STD}-${company.Contact}`;
                    }

                    // Wrap text to fit footer width
                    const addressLines = doc.splitTextToSize(fullAddress, footerWidth - 100);
                    let currentYPosition = textYPosition + 5;

                    // Render each line
                    addressLines.forEach((line) => {
                        doc.text(line, 5, currentYPosition);
                        currentYPosition += lineHeight;
                    });
                }
            },

            CID_onPressGenerateSelectedPDF: async function() {
                try {
                    this.getBusyDialog()

                    const {
                        jsPDF
                    } = window.jspdf;
                    const oView = this.getView();

                    const oTable = this.byId("CID_id_TableInvoiceItem");
                    const aSelectedItems = oTable.getSelectedItems();

                    if (!aSelectedItems.length) {
                        MessageToast.show("Please select at least one invoice item");
                        return;
                    }

                    // ================= SELECTED ITEMS =================
                    const aInvoiceItems = aSelectedItems.map(oItem =>
                        oItem.getBindingContext("ManageInvoiceItemModel").getObject()
                    );

                    // ================= MODELS =================
                    const oCustomerModel = oView.getModel("SelectedCustomerModel").getData();
                    const oSOWModel = oView.getModel("FilteredSOWModel").getData();

                    // ================= GST MASTER CHECK (SAME AS UI) =================
                    const gstin = oCustomerModel.GST;
                    const taxType = oCustomerModel.Type;
                    const taxRate = parseFloat(oCustomerModel.Value) || 0;
                    const currency = oSOWModel.Currency;

                    const isGSTEnabled = !!taxType &&
                        taxRate > 0 &&
                        currency === "INR";

                    // ================= COMPANY DETAILS =================
                    const filter = {
                        BranchID: [oCustomerModel.BranchCode]
                    };
                    const oCompanyDetailsModel = await this.ajaxReadWithJQuery("HM_Branch", filter);
                    const companyImage = oCompanyDetailsModel.data[0]?.Photo1;

                    // ================= RECALCULATE TOTALS (SELECTED ONLY) =================
                    let totalWithGST = 0;
                    let totalWithoutGST = 0;

                    // ================= ROOM TOTAL (FOR COUPON) =================
                    let roomTotal = 0;

                    // ================= SUBTOTAL =================
                    let subTotal = 0;

                    aInvoiceItems.forEach(item => {
                        const amount = parseFloat(item.Total) || 0;

                        subTotal += amount;

                        // Identify Room items
                        const isRoomItem =
                            item.Particulars &&
                            item.Particulars.toLowerCase().includes("room");

                        if (isRoomItem) {
                            roomTotal += amount;
                        }

                        const isGSTApplicable =
                            isGSTEnabled &&
                            item.GSTCalculation === "YES";

                        item.SAC =
                            isGSTApplicable ? "996322" : "-";

                        if (isGSTApplicable) {
                            totalWithGST += amount;
                        } else {
                            totalWithoutGST += amount;
                        }
                    });

                    // ================= COUPON =================
                    let couponDiscount =
                        parseFloat(oCustomerModel.CouponDiscount) || 0;

                    // Coupon cannot exceed room total
                    if (couponDiscount > roomTotal) {
                        couponDiscount = roomTotal;
                    }

                    // ================= DISCOUNTED TOTAL =================
                    let discountedTotal =
                        subTotal - couponDiscount;

                    if (discountedTotal < 0) {
                        discountedTotal = 0;
                    }

                    // ================= GST CALCULATION =================
                    let cgst = 0;
                    let sgst = 0;
                    let igst = 0;
                    let gstAmount = 0;

                    // GST should calculate AFTER discount
                    let finalAmount = discountedTotal;

                    if (isGSTEnabled) {
                        // Proportional taxable amount after discount
                        let taxableAmount = discountedTotal;

                        if (taxType === "CGST/SGST") {
                            gstAmount = (taxableAmount * taxRate) / 100;
                            cgst = gstAmount;
                            sgst = gstAmount;
                            finalAmount += cgst + sgst;
                        } else if (taxType === "IGST") {
                            gstAmount = (taxableAmount * taxRate) / 100;
                            igst = gstAmount;
                            finalAmount += igst;
                        }
                    }

                    // ================= ROUND OFF =================
                    const roundedAmount = Math.round(finalAmount);

                    const roundOff = (roundedAmount - finalAmount).toFixed(2);

                    // ================= ASSIGN VALUES FOR PDF =================
                    oCustomerModel.SubTotal = subTotal.toFixed(2);
                    oCustomerModel.SubTotalInGST = totalWithGST.toFixed(2);
                    oCustomerModel.SubTotalNotGST = totalWithoutGST.toFixed(2);
                    oCustomerModel.DiscountedTotal = discountedTotal.toFixed(2);
                    oCustomerModel.CGST = cgst.toFixed(2);
                    oCustomerModel.SGST = sgst.toFixed(2);
                    oCustomerModel.IGST = igst.toFixed(2);
                    oCustomerModel.CouponDiscount = couponDiscount.toFixed(2);
                    oCustomerModel.RoundOff = roundOff;
                    oCustomerModel.TotalAmount = roundedAmount.toFixed(2);

                    const totalInWords = await this.convertNumberToWords(oCustomerModel.TotalAmount, currency);
                    const showSAC = isGSTEnabled;

                    // ================= PDF INIT =================
                    const doc = new jsPDF("p", "mm", "a4");
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const margin = 15;
                    const usableWidth = pageWidth - margin * 2;
                    let currentY = 25;

                    // ================= HEADER =================
                    doc.setFont("times", "bold").setFontSize(14);
                    doc.text(oCustomerModel.Status === "Payment Received" ? "TAX INVOICE" : "DRAFT INVOICE",
                        pageWidth - 18,
                        currentY, {
                            align: "right"
                        }
                    );

                    if (companyImage) {
                        doc.addImage("data:image/png;base64," + companyImage, "PNG", margin, 15, 40, 40);
                    }

                    // ================= INVOICE DETAILS =================
                    currentY = 40;
                    doc.setFontSize(11).setFont("times", "bold");

                    const details = [
                        ["Invoice No :", oCustomerModel.InvNo],
                        ["Date :", Formatter.formatDate(oCustomerModel.InvDate)],
                        ["Room No :", oCustomerModel.RoomNo]
                    ];

                    details.forEach(row => {
                        doc.text(row[0], pageWidth - 80, currentY);
                        doc.text(String(row[1] || ""), pageWidth - 45, currentY);
                        currentY += 6;
                    });

                    // ================= CUSTOMER DETAILS =================
                    currentY += 10;
                    doc.text("To,", margin, currentY);
                    doc.setFont("times", "normal");

                    if (oCustomerModel.CustomerName)
                        doc.text(`Name : ${oCustomerModel.CustomerName}`, margin, currentY += 6);

                    if (oCustomerModel.PermanentAddress) {
                        const addr = doc.splitTextToSize(oCustomerModel.PermanentAddress, usableWidth / 2);
                        doc.text(addr, margin, currentY += 6);
                        currentY += addr.length * 5;
                    }

                    if (oCustomerModel.MobileNo) {
                        doc.text(`Mobile No : ${oCustomerModel.MobileNo}`, margin, currentY);
                        currentY += 5;
                    }
                    if (oCustomerModel.CustomerEmail) {
                        doc.text(`Email : ${oCustomerModel.CustomerEmail}`, margin, currentY);
                        currentY += 5;
                    }
                    if (oCustomerModel.CustomerGSTNO) {
                        doc.text(`GSTIN : ${oCustomerModel.CustomerGSTNO}`, margin, currentY);
                        currentY += 5;
                    }

                    currentY += 5;

                    // ================= ITEMS TABLE =================
                    const head = showSAC ? [
                        ['Sl.No', 'Particulars', 'SAC', 'Start Date', 'End Date', 'Gross', 'Unit', 'Total']
                    ] : [
                        ['Sl.No', 'Particulars', 'Start Date', 'End Date', 'Gross', 'Unit', 'Total']
                    ];

                    const body = aInvoiceItems.map((item, i) => {
                        const row = [
                            i + 1,
                            item.Particulars,
                            item.StartDate || "",
                            item.EndDate || "",
                            Formatter.fromatNumber(item.GrossPrice),
                            item.UnitText,
                            Formatter.fromatNumber(item.Total)
                        ];
                        if (showSAC) row.splice(2, 0, item.SAC);
                        return row;
                    });

                    doc.autoTable({
                        startY: currentY,
                        head,
                        body,
                        theme: 'grid',
                        headStyles: {
                            fillColor: [20, 170, 183]
                        },
                        styles: {
                            font: "times",
                            fontSize: 10,
                            cellPadding: 3,
                            lineWidth: 0.5,
                            lineColor: [30, 30, 30],
                            halign: "center"
                        },
                        columnStyles: {
                            0: {
                                halign: 'center'
                            },
                            1: {
                                halign: 'left'
                            },
                            ...(showSAC ? {
                                2: {
                                    halign: 'center'
                                },
                                3: {
                                    halign: 'right'
                                },
                                4: {
                                    halign: 'right'
                                },
                                5: {
                                    halign: 'right'
                                },
                                6: {
                                    halign: 'right'
                                },
                                7: {
                                    halign: 'right'
                                }
                            } : {
                                2: {
                                    halign: 'center'
                                },
                                3: {
                                    halign: 'right'
                                },
                                4: {
                                    halign: 'right'
                                },
                                5: {
                                    halign: 'right'
                                },
                                6: {
                                    halign: 'right'
                                }
                            })
                        },
                    });

                    currentY = doc.lastAutoTable.finalY + 6;

                    // ================= SUMMARY =================
                    const summary = [];

                    if (totalWithoutGST > 0)
                        summary.push(["Sub-Total (Non-Taxable) :", Formatter.fromatNumber(totalWithoutGST)]);

                    if (totalWithGST > 0)
                        summary.push(["Sub-Total (Taxable) :", Formatter.fromatNumber(totalWithGST)]);

                    if (couponDiscount > 0)
                        summary.push([
                            `Discount (${oCustomerModel.CouponCode}) :`,
                            "- " + Formatter.fromatNumber(couponDiscount)
                        ]);

                    const pct = taxRate ? `(${taxRate}%)` : "";

                    if (cgst > 0) summary.push([`CGST ${pct} :`, Formatter.fromatNumber(cgst)]);
                    if (sgst > 0) summary.push([`SGST ${pct} :`, Formatter.fromatNumber(sgst)]);
                    if (igst > 0) summary.push([`IGST ${pct} :`, Formatter.fromatNumber(igst)]);

                    const totalRowIndex = summary.length;
                    summary.push(["Total :", Formatter.fromatNumber(roundedAmount)]);

                    doc.autoTable({
                        startY: currentY,
                        body: summary,
                        theme: 'plain',
                        styles: {
                            font: "times",
                            fontSize: 10,
                            halign: "right",
                            cellPadding: 2,
                            overflow: "ellipsize"
                        },
                        columnStyles: {
                            0: {
                                halign: "right",
                                cellWidth: 60
                            },
                            1: {
                                halign: "right",
                                cellWidth: 40
                            }
                        },
                        margin: {
                            left: 95
                        },
                        didParseCell: function(data) {
                            if (data.row.index === totalRowIndex) {
                                data.cell.styles.lineWidth = {
                                    top: 0.5,
                                    right: 0,
                                    bottom: 0,
                                    left: 0
                                };
                                data.cell.styles.lineColor = [0, 0, 0];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    });

                    // ================= AMOUNT IN WORDS =================
                    currentY = doc.lastAutoTable.finalY + 8;
                    doc.setFont("times", "bold");
                    doc.text("Amount in Words :", margin, currentY);
                    doc.setFont("times", "normal");
                    doc.text(doc.splitTextToSize(totalInWords, usableWidth), margin, currentY + 6);

                    currentY += 15;
                    doc.setFontSize(11);
                    doc.setFont("times", "bold");
                    doc.text("Thank you for staying with us.", margin, currentY + 5);

                    // ================= FOOTER =================
                    const totalPages = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        doc.setPage(i);
                        this.addFooter(doc, oCompanyDetailsModel, pageWidth, pageHeight, i, totalPages);
                    }

                    doc.save(`${oCustomerModel.CustomerName}-${oCustomerModel.InvNo}-Invoice.pdf`);

                } catch (e) {
                    MessageToast.show(e.message || "PDF generation failed");
                } finally {
                    this.closeBusyDialog()
                }
            },

            CID_onPressGenerateSummaryPDF: async function() {
                try {
                    this.getBusyDialog()
                    const {
                        jsPDF
                    } = window.jspdf;
                    const oView = this.getView();

                    // ================= FETCH OVERALL INVOICE DATA =================
                    const filterData = oView.getModel("SelectedCustomerModel").getData();

                    const response = await this.ajaxReadWithJQuery("HM_getInvoiceData", {
                        BookingID: [filterData.BookingID]
                    });

                    const invoices = response.data || [];
                    if (!invoices.length) {
                        MessageToast.show("No data found");
                        return;
                    }

                    // ================= COMPANY DETAILS =================
                    const companyRes = await this.ajaxReadWithJQuery("HM_Branch", {
                        BranchID: [invoices[0].BranchCode]
                    });
                    const company = companyRes.data[0];
                    const companyImage = company.Photo1;

                    // ================= PAYMENT HISTORY (COMMON) =================
                    const paymentRes = await this.ajaxReadWithJQuery("HM_Payment", {
                        BookingID: [filterData.BookingID]
                    });

                    // ================= PDF INIT =================
                    const doc = new jsPDF({
                        orientation: "portrait",
                        unit: "mm",
                        format: "a4"
                    });

                    const margin = 15;
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const usableWidth = pageWidth - 2 * margin;

                    // ================= LOOP EACH INVOICE =================
                    for (let invIndex = 0; invIndex < invoices.length; invIndex++) {

                        const oModel = invoices[invIndex];
                        const oCompanyItemModel = oModel.InvoicePaymentDetail || [];

                        if (invIndex > 0) {
                            doc.addPage();
                        }

                        let currentY = 0;

                        // ================= HEADER =================
                        let headerMargin = 25.4;
                        doc.setFontSize(14).setFont("times", "bold");
                        doc.text(
                            oModel.Status === "Payment Received" ? "TAX - INVOICE" : "DRAFT INVOICE",
                            pageWidth - 18,
                            headerMargin, {
                                align: "right"
                            }
                        );

                        if (companyImage && companyImage.trim() !== "") {
                            const imgData = "data:image/png;base64," + companyImage;
                            doc.addImage(imgData, "PNG", margin, 15, 40, 40);
                        }

                        // ================= INVOICE DETAILS =================
                        const detailsStartY = 35;
                        const rowHeight = 6.5;
                        const columnWidths = [30, 30];
                        const rightAlignX = pageWidth - 22 - columnWidths[0] - columnWidths[1];

                        doc.setFontSize(12).setFont("times", "bold");

                        const detailsTable = [{
                                label: "Invoice No. :",
                                value: oModel.InvNo
                            },
                            {
                                label: "Date :",
                                value: Formatter.formatDate(oModel.InvDate)
                            },
                            {
                                label: "Room No :",
                                value: oModel.RoomNo
                            }
                        ];

                        currentY = detailsStartY;
                        detailsTable.forEach(row => {
                            doc.text(row.label, rightAlignX + columnWidths[0] - doc.getTextWidth(row.label), currentY + 5);
                            doc.text(String(row.value), rightAlignX + columnWidths[0] + 5, currentY + 5);
                            currentY += rowHeight;
                        });

                        // ================= CUSTOMER DETAILS =================
                        currentY += 15;
                        doc.setFont("times", "bold").setFontSize(11);
                        doc.text("To,", margin, currentY);

                        currentY += 5;
                        doc.setFont("times", "normal").setFontSize(12);

                        if (oModel.CustomerName) {
                            doc.text(`Name : ${oModel.CustomerName}`, margin, currentY);
                            currentY += 5;
                        }

                        if (oModel.PermanentAddress) {
                            const addressLines = doc.splitTextToSize(oModel.PermanentAddress, usableWidth / 2);
                            doc.text(addressLines, margin, currentY);
                            currentY += addressLines.length * 5;
                        }

                        if (oModel.MobileNo) {
                            doc.text(`Mobile No : ${oModel.MobileNo}`, margin, currentY);
                            currentY += 5;
                        }

                        if (oModel.CustomerEmail) {
                            doc.text(`Email : ${oModel.CustomerEmail}`, margin, currentY);
                            currentY += 5;
                        }

                        if (oModel.CustomerGSTNO) {
                            doc.text(`GSTIN : ${oModel.CustomerGSTNO}`, margin, currentY);
                            currentY += 5;
                        }

                        currentY += 5;

                        // ================= ITEM TABLE =================
                        const showSAC = !!oModel.GST;

                        const body = oCompanyItemModel.map((item, index) => {
                            const row = [
                                index + 1,
                                item.Particulars,
                                Formatter.formatDate(item.StartDate),
                                Formatter.formatDate(item.EndDate),
                                Formatter.fromatNumber(item.GrossPrice),
                                item.UnitText,
                                Formatter.fromatNumber(item.Total)
                            ];
                            if (showSAC) row.splice(2, 0, item.SAC);
                            return row;
                        });

                        const head = showSAC ? [
                            ['Sl.No.', 'Particulars', 'SAC', 'Start Date', 'End Date', 'Gross Price', 'Unit', 'Total']
                        ] : [
                            ['Sl.No.', 'Particulars', 'Start Date', 'End Date', 'Gross Price', 'Unit', 'Total']
                        ];

                        doc.autoTable({
                            startY: currentY,
                            head,
                            body,
                            theme: 'grid',
                            headStyles: {
                                fillColor: [20, 170, 183]
                            },
                            styles: {
                                font: "times",
                                fontSize: 10,
                                cellPadding: 3,
                                lineWidth: 0.5,
                                lineColor: [30, 30, 30],
                                halign: "center"
                            },
                            columnStyles: {
                                0: {
                                    halign: 'center'
                                },
                                1: {
                                    halign: 'left'
                                },
                                ...(showSAC ? {
                                    2: {
                                        halign: 'center'
                                    },
                                    3: {
                                        halign: 'right'
                                    },
                                    4: {
                                        halign: 'right'
                                    },
                                    5: {
                                        halign: 'right'
                                    },
                                    6: {
                                        halign: 'right'
                                    },
                                    7: {
                                        halign: 'right'
                                    }
                                } : {
                                    2: {
                                        halign: 'center'
                                    },
                                    3: {
                                        halign: 'right'
                                    },
                                    4: {
                                        halign: 'right'
                                    },
                                    5: {
                                        halign: 'right'
                                    },
                                    6: {
                                        halign: 'right'
                                    }
                                })
                            },
                        });


                        currentY = doc.lastAutoTable.finalY + 5;

                        // ================= SUMMARY =================
                        const summaryBody = [];
                        const subTotalGST = parseFloat(oModel.SubTotalInGST || 0);
                        const subTotalNoGST = parseFloat(oModel.SubTotalNotGST || 0);
                        const igst = parseFloat(oModel.IGST || 0);
                        const cgst = parseFloat(oModel.CGST || 0);
                        const sgst = parseFloat(oModel.SGST || 0);
                        const totalAmount = parseFloat(oModel.TotalAmount || 0);

                        // Sub Total (GST or NON-GST)
                        if (subTotalGST > 0) {
                            summaryBody.push([`Sub-Total ( Taxable ) (${oModel.Currency}) :`, Formatter.fromatNumber(subTotalGST)]);
                        } else if (subTotalNoGST > 0) {
                            summaryBody.push([`Sub-Total ( Non-Taxable ) (${oModel.Currency}) :`, Formatter.fromatNumber(subTotalNoGST)]);
                        }

                        if (parseFloat(oModel.CouponDiscount) > 0) {
                            summaryBody.push([
                                `Discount (${oModel.CouponCode}) :`,
                                "- " + Formatter.fromatNumber(parseFloat(oModel.CouponDiscount))
                            ]);
                        }

                        // IGST
                        if (oModel.Type === "IGST" && igst > 0) {
                            summaryBody.push([`IGST (${oModel.Value}%) :`, Formatter.fromatNumber(igst)]);
                        }

                        // CGST/SGST
                        if (oModel.Type === "CGST/SGST") {
                            if (cgst > 0) {
                                summaryBody.push([`CGST (${oModel.Value}%) :`, Formatter.fromatNumber(cgst)]);
                            }
                            if (sgst > 0) {
                                summaryBody.push([`SGST (${oModel.Value}%) :`, Formatter.fromatNumber(sgst)]);
                            }
                        }

                        // Total
                        const totalRowIndex = summaryBody.length;
                        summaryBody.push([
                            `Total (${oModel.Currency}) :`,
                            Formatter.fromatNumber(totalAmount)
                        ]);

                        doc.autoTable({
                            startY: currentY,
                            body: summaryBody,
                            theme: 'plain',
                            styles: {
                                font: "times",
                                fontSize: 10,
                                halign: "right",
                                cellPadding: 2,
                                overflow: "ellipsize"
                            },
                            columnStyles: {
                                0: {
                                    halign: "right",
                                    cellWidth: 60
                                },
                                1: {
                                    halign: "right",
                                    cellWidth: 40
                                }
                            },
                            margin: {
                                left: 95
                            },
                            didParseCell: function(data) {
                                if (data.row.index === totalRowIndex) {
                                    data.cell.styles.lineWidth = {
                                        top: 0.5,
                                        right: 0,
                                        bottom: 0,
                                        left: 0
                                    };
                                    data.cell.styles.lineColor = [0, 0, 0];
                                    data.cell.styles.fontStyle = 'bold';
                                }
                            }
                        });

                        currentY = doc.lastAutoTable.finalY + 10;

                        // ================= AMOUNT IN WORDS =================
                        const totalInWords = await this.convertNumberToWords(oModel.TotalAmount, oModel.Currency);
                        doc.setFont("times", "bold");
                        doc.text("Amount in Words :", margin, currentY);
                        currentY += 5;

                        doc.setFont("times", "normal");
                        doc.text(doc.splitTextToSize(totalInWords, usableWidth), margin, currentY);
                    }

                    // ================= Transaction History (ONCE) =================
                    if (paymentRes?.commentData?.length) {
                        doc.addPage();
                        doc.setFont("times", "bold").setFontSize(11);
                        doc.text("Transaction History", margin, 20);

                        doc.autoTable({
                            startY: 25,
                            head: [
                                ['Sl.No', 'Date', 'Payment Type', 'Bank / Mode', 'Transaction ID', 'Amount', 'Currency']
                            ],
                            body: paymentRes.commentData.map((p, i) => ([
                                i + 1,
                                Formatter.formatDate(p.Date),
                                p.PaymentType,
                                p.BankName,
                                p.BankTransactionID || "-",
                                Formatter.fromatNumber(p.Amount),
                                p.Currency
                            ])),
                            theme: 'grid',
                            headStyles: {
                                fillColor: [20, 170, 183]
                            },
                            styles: {
                                font: "times",
                                fontSize: 10,
                                cellPadding: 3,
                                lineWidth: 0.5,
                                lineColor: [30, 30, 30],
                                halign: "center"
                            },
                            columnStyles: {
                                1: {
                                    halign: "center"
                                },
                                2: {
                                    halign: "left"
                                },
                                3: {
                                    halign: "left"
                                },
                                4: {
                                    halign: "left"
                                },
                                5: {
                                    halign: "right"
                                }
                            }
                        });
                    }

                    // ================= FOOTER =================
                    const totalPages = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        doc.setPage(i);
                        this.addFooter(doc, {
                            data: [company]
                        }, pageWidth, pageHeight, i, totalPages);
                    }

                    doc.save(`${filterData.CustomerName}-Invoice.pdf`);
                } catch (e) {
                    MessageToast.show(e.message || "Error generating summary invoice");
                } finally {
                    this.closeBusyDialog()
                }
            },

            CID_onPressrefundAmount: function() {
                var that = this;
                if (this.oDialog) {
                    this.oDialog.destroy();
                    this.oDialog = null;
                }
                var oView = that.getView();
                if (!that.oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.ui.com.project1.fragment.RefundAmount",
                        controller: that
                    }).then(function(oDialog) {
                        that.oDialog = oDialog;
                        oView.addDependent(oDialog);
                        oDialog.open();
                        that.refundFunction();
                    });
                } else {
                    that.oDialog.open();
                    that.refundFunction();
                }
            },

            refundFunction: function() {
                var oNavigationModel = this.getView().getModel("SelectedCustomerModel").getData();

                var oModel = new sap.ui.model.json.JSONModel({
                    InvNo: oNavigationModel.InvNo,
                    TransactionId: "",
                    ReceivedDate: "",
                    RefundAmount: oNavigationModel.RefundAmount,
                    Currency: oNavigationModel.Currency,
                    CustomerName: oNavigationModel.CustomerName,
                    BookingID: oNavigationModel.BookingID,
                    BranchCode: oNavigationModel.BranchCode
                });
                this.getView().setModel(oModel, "RefundModel");
            },

            HM_onPressRefundAmount: async function() {
                var RefundModel = this.getView().getModel("RefundModel").getData();
                const isMandatoryValid =
                    utils._LCstrictValidationComboBox(sap.ui.getCore().byId("HM_id_PaymentMode"), "ID") &&
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("HM_id_TransactionID"), "ID") &&
                    utils._LCvalidateDate(sap.ui.getCore().byId("HM_id_ReceivedDate"), "ID");

                const isValid = isMandatoryValid
                if (!isValid) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }

                this.getBusyDialog()
                const jsonData = {
                    InvNo: String(RefundModel.InvNo),
                    BankTransactionID: String(RefundModel.TransactionId),
                    Date: RefundModel.ReceivedDate ? RefundModel.ReceivedDate.split("/").reverse().join("-") : "",
                    Amount: (RefundModel.RefundAmount),
                    Currency: String(RefundModel.Currency),
                    CustomerName: RefundModel.CustomerName,
                    BookingID: RefundModel.BookingID,
                    BranchCode: RefundModel.BranchCode,
                    PaymentType: RefundModel.PaymentMode,
                    BankName: RefundModel.PaymentMode,
                    Used: "Y"
                };

                try {
                    const oData = await this.ajaxCreateWithJQuery("HM_Payment", {
                        data: jsonData
                    });

                    if (oData && oData.success) {
                        this.oDialog.close();

                        await this.Readcall("HM_InvoicePaymentDetail", {
                            InvNo: this.decodedPath
                        });

                        var oResult = await this.ajaxReadWithJQuery("HM_ManageInvoiceItem", {
                            InvNo: this.decodedPath
                        });

                        const oInvoice = oResult.data.ManageInvoice[0];
                        const oSelectedModel = this.getView().getModel("SelectedCustomerModel");

                        // Format dates
                        oInvoice.InvoiceDate = this.Formatter.formatDate(oInvoice.InvoiceDate);
                        oInvoice.PayByDate = this.Formatter.formatDate(oInvoice.PayByDate);

                        // Set model
                        oSelectedModel.setData(oInvoice);
                        oSelectedModel.refresh(true);
                        oSelectedModel.refresh(true);
                        // this.visiablityPlay.setProperty("/Edit", false);
                        this.visiablityPlay.setProperty("/editable", false);
                        this.visiablityPlay.setProperty("/CInvoice", false);
                        this.visiablityPlay.setProperty("/merge", true);
                        this.visiablityPlay.setProperty("/addInvBtn", false);
                        this.visiablityPlay.setProperty("/refresh", false);
                        if (this.oDialog) {
                            this.oDialog.destroy();
                            this.oDialog = null;
                        }
                        MessageToast.show(this.i18nModel.getText("refundMessage"));
                    }
                } catch (error) {
                    MessageToast.show(error.responseText);
                } finally {
                    this.closeBusyDialog()
                }
            },

            HM_onPressClose: function() {
                sap.ui.getCore().byId("HM_id_PaymentMode").setValueState("None");
                sap.ui.getCore().byId("HM_id_TransactionID").setValueState("None");
                sap.ui.getCore().byId("HM_id_ReceivedDate").setValueState("None");

                if (this.oDialog) {
                    this.oDialog.close();
                    this.oDialog.destroy(true);
                    this.oDialog = null;
                }
            },

            onRefreshInvoice: async function() {
                try {
                    const oView = this.getView();
                    const oModel = oView.getModel("SelectedCustomerModel").getData();

                    this.getBusyDialog();

                    const oData = await this.ajaxReadWithJQuery("HM_BookingFacilityItems", {
                        BookingID: oModel.BookingID,
                    });

                    const finalItems = this._prepareInvoiceItems(oData);

                    oView.getModel("ManageInvoiceItemModel").setProperty("/ManageInvoiceItem", finalItems);

                    await this.totalAmountCalculation();
                } catch (e) {
                    MessageToast.show(e.message);
                } finally {
                    this.closeBusyDialog();
                }
            },

            _prepareInvoiceItems: function(oData) {
                const oView = this.getView();
                const existingItems = oView.getModel("ManageInvoiceItemModel")
                    .getProperty("/ManageInvoiceItem") || [];

                const roomRent = existingItems.find(i =>
                    i.Particulars.includes("Room Rent")
                );

                if (!roomRent) return existingItems;

                const cycleStart = this._parseDate(roomRent.StartDate);
                const cycleEnd = this._parseDate(roomRent.EndDate);

                cycleStart.setHours(0, 0, 0, 0);
                cycleEnd.setHours(0, 0, 0, 0);

                const existingFacilities = existingItems.filter(i =>
                    i.Particulars.includes("Facility")
                );

                const nonFacilityItems = existingItems.filter(i =>
                    !i.Particulars.includes("Facility")
                );

                const dbFacilitiesRaw = oData.commentData || [];

                const newFacilityItems = [];

                dbFacilitiesRaw.forEach((f) => {

                    let fStart = new Date(f.StartDate);
                    let fEnd = new Date(f.EndDate);

                    fStart.setHours(0, 0, 0, 0);
                    fEnd.setHours(0, 0, 0, 0);

                    if (fEnd < cycleStart || fStart > cycleEnd) return;

                    const effectiveStart = fStart > cycleStart ? fStart : cycleStart;
                    const effectiveEnd = fEnd < cycleEnd ? fEnd : cycleEnd;

                    let particulars = "";
                    const memberSuffix = f.MemberName ? ` (${f.MemberName})` : "";

                    if (f.FacilityName === "Penalty Charges") {
                        particulars = `Penalty Charges${memberSuffix}`;
                    } else if (f.UnitText === "Per Hour") {
                        const hrs = Number(f.TotalHour) || 1;
                        particulars = `${f.FacilityName} - Facility (${hrs} Hours)${memberSuffix}`;
                    } else {
                        particulars = `${f.FacilityName} - Facility${memberSuffix}`;
                    }

                    const startStr = this.Formatter.DateFormat(effectiveStart);
                    const endStr = this.Formatter.DateFormat(effectiveEnd);
                    const isAlreadyExists = existingFacilities.some(e =>
                        e.Particulars === particulars &&
                        e.StartDate === startStr &&
                        e.EndDate === endStr
                    );

                    if (isAlreadyExists) return;

                    // ================= ADD NEW =================
                    newFacilityItems.push({
                        ItemID: null,
                        InvNo: nonFacilityItems[0]?.InvNo,
                        Particulars: particulars,
                        UnitText: f.UnitText,

                        DurationText: this._getDurationText(
                            f.UnitText,
                            effectiveStart,
                            effectiveEnd,
                            f.TotalHour,
                            f.SelectionMode,
                            f.Quantity
                        ),

                        GrossPrice: Number(f.BasicFacilityPrice) || 0,
                        Total: this._calculateFacilityTotal(f, cycleStart, cycleEnd, 0),
                        StartDate: startStr,
                        EndDate: endStr,
                        Currency: f.Currency || "INR",
                        GSTCalculation: "YES",
                        Discount: "0.00",
                        GrossPriceEditable: false,
                        UnitEditable: false,
                        DurationEditable: false,
                        StartDateEditable: false,
                        EndDateEditable: false
                    });
                });

                const finalItems = [
                    ...nonFacilityItems,
                    ...existingFacilities,
                    ...newFacilityItems
                ];

                finalItems.forEach((item, index) => {
                    item.IndexNo = index + 1;
                });

                return finalItems;
            },

            _parseDate: function(dateStr) {
                const [day, month, year] = dateStr.split("/");
                return new Date(`${year}-${month}-${day}`);
            },

            _calculateFacilityTotal: function(item, cycleStart, cycleEnd, invoiceIndex = 0) {

                let sDate = new Date(item.StartDate);
                let eDate = new Date(item.EndDate);

                sDate.setHours(0, 0, 0, 0);
                eDate.setHours(0, 0, 0, 0);

                // Overlap check
                const overlaps = !(eDate < cycleStart || sDate > cycleEnd);
                if (!overlaps) return 0;

                const effectiveStart = sDate > cycleStart ? sDate : cycleStart;
                const effectiveEnd = eDate < cycleEnd ? eDate : cycleEnd;

                const usedDays = this._calculateDays(effectiveStart, effectiveEnd);
                const useddaysforday = this._calculateDaysForDay(effectiveStart, effectiveEnd);

                const unit = item.UnitText?.toLowerCase();
                const selectionMode = item.SelectionMode?.toUpperCase();
                const chargeType = item.FacilityChargeType?.toUpperCase();

                const qty = Number(item.Quantity) || 1;
                const unitPrice = Number(item.BasicFacilityPrice) || 0;
                const totalHour = Number(item.TotalHour) || 1;
                const totalprice = Number(item.FacilitiPrice) || unitPrice;

                let multiplier = 1;
                let facilityAmount = 0;

                // ================= PERSON_QTY =================
                if (selectionMode === "PERSON_QTY") {

                    if (chargeType === "DAILY") {
                        const totalUnits = qty * useddaysforday;
                        facilityAmount = this._truncate2(totalUnits * unitPrice);
                    } else if (chargeType === "ONCE_PER_BOOKING") {
                        if (invoiceIndex > 0) return 0;

                        const totalUnits = qty;
                        facilityAmount = this._truncate2(totalUnits * unitPrice);
                    }

                    return facilityAmount;
                }

                // ================= MULTIPLIER =================
                if (selectionMode === "QTY" || selectionMode === "PERSON") {
                    multiplier = qty;
                } else if (selectionMode === "SINGLE") {
                    multiplier = 1;
                }

                // ================= UNIT LOGIC =================
                if (unit === "per day") {
                    facilityAmount = this._truncate2(multiplier * unitPrice * useddaysforday);
                } else if (unit === "per hour") {
                    facilityAmount = this._truncate2(multiplier * unitPrice * totalHour * useddaysforday);
                } else if (unit === "per month") {

                    const usedMonths = this._calculateMonths(effectiveStart, effectiveEnd);
                    facilityAmount = this._truncate2(multiplier * unitPrice * usedMonths);
                } else if (unit === "per year") {

                    const totalMonths = this._calculateMonths(sDate, eDate);
                    const years = Math.ceil(totalMonths / 12) || 1;

                    const yearlyPrice = totalprice / years;
                    const overlapDays = usedDays;

                    if (overlapDays >= 364) {
                        facilityAmount = this._round2(multiplier * yearlyPrice);
                    } else {
                        const dailyRate = yearlyPrice / 365;
                        facilityAmount = this._round2(multiplier * dailyRate * overlapDays);
                    }
                }

                return facilityAmount;
            },

            _calculateDays: function(start, end) {
                return Math.floor((end - start) / 86400000) + 1;
            },

            _calculateDaysForDay: function(start, end) {
                return Math.floor((end - start) / 86400000);
            },

            _calculateMonths: function(start, end) {
                let months =
                    (end.getFullYear() - start.getFullYear()) * 12 +
                    (end.getMonth() - start.getMonth());

                if (end.getDate() >= start.getDate()) months += 1;

                return months;
            },

            _round2: function(value) {
                return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
            },

            _truncate2: function(value) {
                return Math.floor(Number(value) * 100) / 100;
            },
        });
    });