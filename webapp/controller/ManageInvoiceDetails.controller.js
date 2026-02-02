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
                sap.ui.core.BusyIndicator.show(0);
                var sArg = oEvent.getParameter("arguments").sPath;
                var sSource = oEvent.getParameter("arguments").dash; // Get the source parameter
                this.sourceView = sSource || "ManageInvoice";

                this.scrollToSection("CID_id_CmpInvObjectPageLayout", "CID_id_CmpInvGoals");
                this._makeDatePickersReadOnly(["CID_id_Invoice", "CID_id_Payby", "CID_id_NavInvoice", "CID_id_NavPayby", "CI_Id_Status"]);

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
                    CustomerID: "",
                    BookingID: "",
                    CustomerName: "",
                    InvNo: "",
                    InvoiceDate: "",
                    Name: "",
                    PAN: "",
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
                    BranchCode: ""
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

                var SowDataModel = new JSONModel({
                    items: []
                });
                this.getView().setModel(SowDataModel, "CombinedData");
                this.visiablityPlay = oView.getModel("visiablityPlay");
                this.visiablityPlay.setProperty("/Edit", false);
                this.visiablityPlay.setProperty("/MultiEmail", false);
                this.visiablityPlay.setProperty("/merge", false);
                oView.setModel(new JSONModel(), "ManageInvoiceItemModel");
                this.byId("CID_id_TableInvoiceItem").setMode("Delete");
                this.Update = false;
                await this.onSearch();
                if (sArg === "X") {
                    const oNavCtx = this.getOwnerComponent().getModel("InvoiceNavContext");
                    const sCustomerID = oNavCtx?.getProperty("/CustomerID");
                    const oCustomerCombo = this.byId("CID_id_AddCustComboBox");

                    if (sCustomerID) {
                        oCustomerCombo.setSelectedKey(null);
                        sap.ui.getCore().applyChanges();

                        oCustomerCombo.setSelectedKey(sCustomerID);
                        this.SelectKey = sCustomerID;

                        //  Lock only for Room Assign flow
                        oCustomerCombo.setEditable(false);

                        await this.onChangeAddCustomer({
                            getSource: () => oCustomerCombo
                        });

                        // Clear nav context AFTER use
                        oNavCtx.setProperty("/CustomerID", "");
                    } else {
                        oCustomerCombo.setEditable(true);
                    }
                    sap.ui.core.BusyIndicator.hide();
                    return;
                }
                this.visiablityPlay.setProperty("/Edit", true);
                this.visiablityPlay.setProperty("/flexVisiable", true);
                this.visiablityPlay.setProperty("/createVisi", false);
                this.visiablityPlay.setProperty("/editVisi", true);
                this.visiablityPlay.setProperty("/editable", false);
                this.visiablityPlay.setProperty("/addInvBtn", false);
                this.visiablityPlay.setProperty("/MultiEmail", false);
                this.byId("CID_id_TableInvoiceItem").setMode("None");
                this.byId("CID_id_CurrencySelect").setEditable(false);
                this.visiablityPlay.setProperty("/merge", true);
                this.visiablityPlay.setProperty("/MultiEmail", true);

                sap.ui.core.BusyIndicator.show(0);
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

                    this.SelectedCustomerModel.setData(oHeader);

                    const aItems = oData.data.ManageInvoiceItem.map((item, index) => ({
                        ...item,
                        IndexNo: index + 1,
                        StartDate: item.StartDate ? this.Formatter.DateFormat(item.StartDate) : "",
                        EndDate: item.EndDate ? this.Formatter.DateFormat(item.EndDate) : "",
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
                        this.visiablityPlay.setProperty("/Edit", false);
                        this.visiablityPlay.setProperty("/MultiEmail", false);
                    }
                    this.Status = Status;
                    this.totalAmountCalculation();
                    this.Readcall("HM_InvoicePaymentDetail", {
                        InvNo: this.decodedPath
                    })
                } catch (error) {
                    MessageToast.show(error.responseText || "Failed to Load Invoice Data.");
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
            },

            onSearch: function () {
                return new Promise((resolve, reject) => {
                    sap.ui.core.BusyIndicator.show(0);

                    var filter = {
                        BranchCode: this.BranchCode
                    };

                    this.ajaxReadWithJQuery("HM_CustomerReadCall", filter)
                        .then((oData) => {
                            var aData = Array.isArray(oData.commentData)
                                ? oData.commentData
                                : [oData.commentData];

                            const aFilteredData = aData.filter(item =>
                                item.Status === "Assigned" || item.Status === "Completed"
                            );

                            this.getView().setModel(
                                new sap.ui.model.json.JSONModel(aFilteredData),
                                "ManageCustomerModel"
                            );

                            resolve(); // ✅ VERY IMPORTANT
                        })
                        .catch((err) => {
                            MessageToast.show(err.responseText || "Failed to Load Customer Data.");
                            sap.ui.core.BusyIndicator.hide();
                        })
                });
            },

            // onNavBack: function() {
            //     const oLoginModel = this.getView().getModel("LoginModel");
            //     const sRole = oLoginModel?.getProperty("/Role") || "";
            //     const sEmpID = oLoginModel?.getProperty("/EmployeeID") || "";
            //     if (sRole === "Customer") {
            //         this._sLoggedUserID = sEmpID;
            //         const oUIModel = this.getOwnerComponent().getModel("UIModel");
            //         oUIModel.setProperty("/isLoggedIn", true);
            //         this.getOwnerComponent().getRouter().navTo("RouteHostel");
            //     }else if (this.sourceView === "AdminPage") {
            //         this.getOwnerComponent().getRouter().navTo("RouteAdmin");
            //     }else {
            //         this.getOwnerComponent().getRouter().navTo("RouteManageInvoice");
            //     }
            // },
            onNavBack: function () {
                const oLoginModel = this.getView().getModel("LoginModel");
                const sRole = oLoginModel?.getProperty("/Role") || "";
                const sEmpID = oLoginModel?.getProperty("/EmployeeID") || "";

                if (sRole === "Customer") {
                    this._sLoggedUserID = sEmpID;
                    const oUIModel = this.getOwnerComponent().getModel("UIModel");
                    oUIModel.setProperty("/isLoggedIn", true);
                    this.getOwnerComponent().getRouter().navTo("RouteHostel");
                } else if (this.sourceView === "AdminPage") {
                    this.getOwnerComponent().getRouter().navTo("RouteAdmin");
                } else if (this.sourceView === "PaymentDashboard") {
                    this.getOwnerComponent().getRouter().navTo("RouteHostelDashboard");
                } else {
                    this.getOwnerComponent().getRouter().navTo("RouteManageInvoice");
                }
            },
            onHome: function() {
                this.CommonLogoutFunction();
            },

            onChangeAddCustomer: async function(oEvent) {
                try {
                    sap.ui.core.BusyIndicator.show(0);
                    utils._LCvalidateMandatoryField(oEvent);

                    this.SelectKey = oEvent.getSource().getSelectedKey();
                    const allData = this.getView().getModel("ManageCustomerModel").getData();

                    // Filter selected customer record
                    const SelectedData = allData.find(item => item.CustomerID === this.SelectKey);
                    if (!SelectedData) return;

                    sap.ui.core.BusyIndicator.show(0);

                    // Filter booking list for selected customer
                    const bookingList = allData.filter(item => item.CustomerID === this.SelectKey).map(i => ({
                        BookingID: i.BookingID,
                        Status: i.Status
                    }));

                    const bookingModel = new sap.ui.model.json.JSONModel(bookingList);
                    this.getView().setModel(bookingModel, "BookingModel");

                    // Reset booking combo
                    this.byId("CID_id_AddBooking").setSelectedKey("");

                    // Reset invoice model
                    this.getView().getModel("ManageInvoiceItemModel").setProperty("/ManageInvoiceItem", []);
                } catch (err) {
                    sap.m.MessageToast.show(err.message);
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
            },

            onChangeBookingID: async function(oEvent) {
                try {
                    const bookingID = oEvent.getSource().getSelectedKey();
                    const customerID = this.SelectKey;

                    if (!bookingID || !customerID) return;

                    sap.ui.core.BusyIndicator.show(0);

                    const oData = await this.ajaxCreateWithJQuery("HM_getAllInvoiceData", {
                        data: {
                            CustomerID: customerID,
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
                            CustomerID: customerID,
                            BookingID: bookingID,
                            UserID: bookingDetails.UserID || "",
                            PaidAmount: oData.data.PerMonthTotalRent || "0.00",
                            CouponCode: bookingDetails.CouponCode,
                            GST : oData.data.BranchDetails.GSTIN || "",
                            Type : oData.data.BranchDetails.Type || "",
                            Value : oData.data.BranchDetails.Value || ""
                        });
                    }

                    mergedData.InvoiceDate = new Date(invoiceDate);
                    mergedData.PayByDate = new Date(payByDate);
                    mergedData.InvoiceDescription = this._getInvoiceDescription(invoiceDate);
                    oModel.setData(mergedData);           

                    this.byId("CID_id_Invoice").setMinDate(invoiceDate);
                    this.byId("CID_id_Payby").setMinDate(invoiceDate);

                    this.byId("CID_id_Invoice").setDateValue(invoiceDate);
                    this.byId("CID_id_Payby").setDateValue(payByDate);

                    let finalInvoiceItems = [];

                    finalInvoiceItems.push({
                        IndexNo: 1,
                        InvNo: this.newID,
                        Particulars: `${bookingDetails.BedType} - Room Rent`,
                        UnitText: bookingDetails.PaymentType,
                        SAC: "996322",
                        GSTCalculation: "YES",
                        Discount: "0.00",
                        GrossPrice: bookingDetails.RoomPrice,
                        Total: parseFloat(bookingDetails.BookingPrice),
                        StartDate: this.Formatter.DateFormat(bookingDetails.StartDate),
                        EndDate: this.Formatter.DateFormat(bookingDetails.EndDate),
                        Currency: bookingDetails.Currency,
                        // editable: false
                    });

                    facilityArray.forEach((item, index) => {
                        const totalHours =
                            item.TotalHour && item.TotalHour !== "" ? item.TotalHour : 1; // Default TotalHour → 1 if empty

                        let particulars = ""; // Build Particulars
                        if (item.FacilityName === "Penalty Charges") {
                            particulars = "Penalty Charges";
                        } else if (item.UnitText === "Per Hour") {
                            particulars = `${item.FacilityName} - Facility (${totalHours} Hours)`;
                        } else {
                            particulars = `${item.FacilityName} - Facility`;
                        }

                        finalInvoiceItems.push({
                            IndexNo: index + 2,
                            InvNo: this.newID,
                            Particulars: particulars,
                            UnitText: item.UnitText,
                            SAC: "996322",
                            GSTCalculation: "YES",
                            Discount: "0.00",
                            GrossPrice: item.BasicFacilityPrice,
                            Total: parseFloat(item.FacilityPrice),
                            StartDate: this.Formatter.DateFormat(item.StartDate),
                            EndDate: this.Formatter.DateFormat(item.EndDate),
                            Currency: item.Currency
                        });
                    });

                    this.getView().getModel("ManageInvoiceItemModel").setProperty("/ManageInvoiceItem", finalInvoiceItems);
                    await this.totalAmountCalculation();
                    utils._LCvalidateMandatoryField(oEvent);
                } catch (err) {
                    sap.m.MessageToast.show(err.message);
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
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

            _getInvoiceDescription: function (oDate) {
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
                // Generate new invoice item
                const currency = this.byId("CID_id_CurrencySelect").getValue();
                this.IndexNo = oData.length ? oData[oData.length - 1].IndexNo + 1 : 1;
                const newItem = {
                    IndexNo: this.IndexNo,
                    Particulars: "",
                    SAC: "996322",
                    GSTCalculation: (currency === "INR") ? "YES" : "",
                    StartDate: this.Formatter.formatDate(new Date()),
                    EndDate: this.Formatter.formatDate(new Date()),
                    UnitText: "Fix Bid",
                    Currency: currency,
                    Discount: "0.00",
                    GrossPrice: "0.00",
                    Total: "",
                    // editable: true
                };
                if (this.Update) {
                    newItem.flag = "create";
                }
                // Add and update model
                oData.push(newItem);
                oItemModel.setProperty("/ManageInvoiceItem", oData);
            },

            CI_On_ChangeRateType: function(oEvent) {
                var data = oEvent.getSource().getSelectedItem().getBindingContext("ManageInvoiceItemModel").getObject();

                switch (data.UnitText) {
                    case 'Per Day':
                        data.Unit = 20;
                        break;
                    case 'Per Month':
                        data.Unit = 1;
                        break;
                    case 'Per Hour':
                        data.Unit = 168;
                        break;
                    case 'Fixed Bid':
                        data.Unit = 1;
                        break;
                    default:
                        data.Unit = 1;
                }
                // Optionally update the model (if using two-way binding or need manual update)
                this.getView().getModel("ManageInvoiceItemModel").refresh(true);
                this.totalAmountCalculation();
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
                const gstin = oCustomerModel.getProperty("/GST");
                const taxType = oCustomerModel.getProperty("/Type");
                const taxRate = parseFloat(oCustomerModel.getProperty("/Value")) || 0;
                const currency = oSOWModel.getProperty("/Currency");

                const isGSTEnabled =
                    !!gstin &&
                    !!taxType &&
                    taxRate > 0 &&
                    currency === "INR";

                this.visiablityPlay.setProperty("/GST", isGSTEnabled);

                // ---------------- ITEM CALCULATION ----------------
                aItems.forEach((item) => {
                    const baseAmount = parseFloat(item.Total) || 0;

                    // ---------- DISCOUNT ----------
                    let discountAmount = 0;
                    if (typeof item.Discount === "string" && item.Discount.trim().endsWith("%")) {
                        discountAmount = baseAmount * (parseFloat(item.Discount) / 100);
                    } else {
                        discountAmount = parseFloat(item.Discount) || 0;
                    }

                    if (discountAmount > baseAmount) {
                        discountAmount = 0;
                        item.Discount = "0.00";
                    } else {
                        item.Discount = discountAmount.toFixed(2);
                    }

                    let finalAmount = baseAmount - discountAmount;
                    item.Total = finalAmount.toFixed(2);

                    // ---------- GST APPLICABLE ----------
                    let isGSTApplicable = false;

                    if (isGSTEnabled && item.GSTCalculation === "YES") {
                        isGSTApplicable = true;
                    } else {
                        item.GSTCalculation = "NO";
                    }

                    item.SAC = isGSTApplicable ? "996322" : "-";

                    if (isGSTApplicable) {
                        totalWithGST += finalAmount;
                    } else {
                        totalWithoutGST += finalAmount;
                    }
                });

                // ---------------- SUBTOTALS ----------------
                oCustomerModel.setProperty("/SubTotalInGST", totalWithGST.toFixed(2));
                oCustomerModel.setProperty("/SubTotalNotGST", totalWithoutGST.toFixed(2));

                // ---------------- COUPON ----------------
                let couponDiscount = parseFloat(oCustomerModel.getProperty("/CouponDiscount")) || 0;
                oCustomerModel.setProperty("/CouponDiscountValue", couponDiscount.toFixed(2));

                // ---------------- GST CALCULATION ----------------
                let gstAmount = 0;
                let finalAmount = totalWithGST + totalWithoutGST;

                if (isGSTEnabled) {
                    if (taxType === "CGST/SGST") {
                        gstAmount = (totalWithGST * taxRate) / 100;
                        finalAmount += gstAmount * 2;

                        oCustomerModel.setProperty("/CGST", gstAmount.toFixed(2));
                        oCustomerModel.setProperty("/SGST", gstAmount.toFixed(2));
                        oCustomerModel.setProperty("/IGST", "0.00");
                    } 
                    else if (taxType === "IGST") {
                        gstAmount = (totalWithGST * taxRate) / 100;
                        finalAmount += gstAmount;
                        oCustomerModel.setProperty("/IGST", gstAmount.toFixed(2));
                        oCustomerModel.setProperty("/CGST", "0.00");
                        oCustomerModel.setProperty("/SGST", "0.00");
                    }
                } else {
                    // GST NOT APPLICABLE
                    oCustomerModel.setProperty("/CGST", "0.00");
                    oCustomerModel.setProperty("/SGST", "0.00");
                    oCustomerModel.setProperty("/IGST", "0.00");
                }

                // ---------------- APPLY COUPON AFTER GST ----------------
                finalAmount -= couponDiscount;
                if (finalAmount < 0) finalAmount = 0;

                // ---------------- ROUND OFF ----------------
                let roundedAmount = Math.round(finalAmount);
                let roundOffDiff = (roundedAmount - finalAmount).toFixed(2);

                oSOWModel.setProperty("/RoundOf", roundOffDiff);
                oSOWModel.setProperty("/TotalAmount", roundedAmount.toFixed(2));
                oSOWModel.setProperty("/gstAmount", gstAmount.toFixed(2));
                oCustomerModel.setProperty("/TotalAmount", roundedAmount.toFixed(2));

                // ---------------- PAID & BALANCE AMOUNT ----------------
                let paidAmount = parseFloat(oCustomerModel.getProperty("/PaidAmount")) || 0;

                // Always recalculate balance
                let balanceAmount = roundedAmount - paidAmount;

                // Clamp negative balance
                if (balanceAmount < 0) {
                    balanceAmount = 0;
                }

                // Persist values
                oCustomerModel.setProperty("/PaidAmount", paidAmount.toFixed(2));
                oCustomerModel.setProperty("/BalanceAmount", balanceAmount.toFixed(2));
                oSOWModel.setProperty("/BalanceAmount", balanceAmount.toFixed(2));

                oInvoiceModel.refresh(true);
                this.onChangeConversionRate();
            },

            Comp_onChangeGSTCalculation: function(oEvent) {
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

                const oPayload = {
                    InvoiceDate: (sMode === 'update') ? oSelectedCustomerModel.InvoiceDate.split('/').reverse().join('-') : this.Formatter.formatDate(oSelectedCustomerModel.InvoiceDate).split('/').reverse().join('-') || "",
                    CustomerName: (sMode === 'update') ? oSelectedCustomerModel.CustomerName : oSelectedCustomerModel.CustomerName,
                    GST: oSelectedCustomerModel.GST != null ? String(oSelectedCustomerModel.GST) : '',
                    PermanentAddress: (oSelectedCustomerModel.PermanentAddress) || "",
                    PAN: (oSelectedCustomerModel.PAN) || "",
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
                    Status: oSelectedCustomerModel.Status || "Submitted",
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
                    CustomerID: oSelectedCustomerModel.CustomerID || "",
                    BookingID: oSelectedCustomerModel.BookingID || "",
                    BranchCode: oSelectedCustomerModel.BranchCode || "",
                    RoomNo: oSelectedCustomerModel.RoomNo || "",
                    CouponDiscount: oSelectedCustomerModel.CouponDiscount || "",
                    UserID: oSelectedCustomerModel.UserID || "",
                    PaidAmount: oSelectedCustomerModel.PaidAmount || "",
                    BalanceAmount: oSelectedCustomerModel.BalanceAmount || "",
                    CouponCode: oSelectedCustomerModel.CouponCode || "",
                };
                const aItemsRaw = oManageInvoiceItemModel.ManageInvoiceItem || [];
                if (aItemsRaw.length === 0) {
                    sap.ui.core.BusyIndicator.show(0);
                    MessageToast.show(this.i18nModel.getText("companyTableValidation"));
                    return false;
                }
                for (let i = 0; i < aItemsRaw.length; i++) {
                    const item = aItemsRaw[i];
                    if (!item.Particulars) {
                        sap.ui.core.BusyIndicator.show(0);
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
                        StartDate: item.StartDate.split('/').reverse().join('-'),
                        EndDate: item.EndDate.split('/').reverse().join('-'),
                    };
                    if (sMode === "update") {
                        let filters;
                        if (item.flag === "create") {
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
                    sap.ui.core.BusyIndicator.show(0);
                    const oPayload = await this.SubmitPayload("Create");
                    if (oPayload === false) {
                        sap.ui.core.BusyIndicator.hide();
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
                        that.closeBusyDialog();
                        var oDialog = new sap.m.Dialog({
                            title: that.i18nModel.getText("success"),
                            type: sap.m.DialogType.Message,
                            state: sap.ui.core.ValueState.Success,
                            content: new sap.m.Text({
                                text: that.i18nModel.getText("invoiceCreatemsg")
                            }),
                            beginButton: new sap.m.Button({
                                text: "OK",
                                type: "Transparent",
                                press: function() {
                                    oDialog.close();
                                    that.getOwnerComponent().getRouter().navTo("RouteManageInvoice");
                                }
                            }),
                            endButton: new sap.m.Button({
                                text: "Generate PDF",
                                type: "Transparent",
                                press: async () => {
                                    oDialog.close();
                                    await that.CID_onPressGeneratePdf();
                                    that.getOwnerComponent().getRouter().navTo("RouteManageInvoice");
                                }
                            }),
                            afterClose: function() {
                                oDialog.destroy();
                            }
                        });
                        oDialog.open();
                    } catch (error) {
                        sap.m.MessageToast.show(error.responseText || "Submission Failed");
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
                    this.byId("CID_id_TableInvoiceItem").setMode("Delete");
                    this.visiablityPlay.setProperty("/addInvBtn", true);
                    this.visiablityPlay.setProperty("/merge", false);
                    this.visiablityPlay.setProperty("/MultiEmail", false);
                    this.visiablityPlay.setProperty("/payByDate", false);
                }
            },

            CID_onPressLiveChangeEmail: function(oEvent) {
                utils._LCvalidateEmail(oEvent)
            },

            CID_onPressLiveChangeMobileNo: function(oEvent) {
                this.mobileNo = utils._LCvalidateMobileNumber(oEvent);
            },

            CID_onPressLiveChangeGST: function(oEvent) {
                var oInput = oEvent.getSource();
                utils._LCvalidateGstNumber(oEvent)
                if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
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
                        utils._LCvalidateMandatoryField(this.byId("CID_id_InvoiceDesc"), "ID") && this.mobileNo &&
                        utils._LCvalidateEmail(this.byId("CID_id_InputMailID"), "ID") &&
                        (!!this.Discount && !!this.Particulars)

                    if (!bIsValid) {
                        return MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                    }

                    sap.ui.core.BusyIndicator.show(0);
                    const oPayload = await this.SubmitPayload("update");

                    if (oPayload === false) {
                        sap.ui.core.BusyIndicator.hide();
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
                        this.byId("CID_id_TableInvoiceItem").setMode("None");
                        this.visiablityPlay.setProperty("/addInvBtn", false);
                        this.visiablityPlay.setProperty("/merge", true);
                        this.visiablityPlay.setProperty("/MultiEmail", true);
                        if (Status !== "Payment Received") this.visiablityPlay.setProperty("/payByDate", this.ReminderEmail);
                        if (Status === "Payment Received") {
                            this.visiablityPlay.setProperty("/MultiEmail", false);
                            this.visiablityPlay.setProperty("/Edit", false);
                        }
                        MessageToast.show(this.i18nModel.getText("invoiceUpdateMess"));
                        sap.ui.core.BusyIndicator.hide();
                    } catch (error) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(error.responseText || this.i18nModel.getText("invoiceUpdateMessFailed"));
                    }
                } catch (error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },

            onChangeInvoiceStatus: function(oEventOrStatus) {
                var that = this;
                var status = "";

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
                    // ADD THIS CHECK (no existing logic changed)
                    var oNavData = this.getView().getModel("SelectedCustomerModel").getData();
                    var fTotalAmount = parseFloat(oNavData.TotalAmount) || 0;
                    var fReceivedAmount = parseFloat(oNavData.PaidAmount) || 0;

                    if (fTotalAmount === fReceivedAmount) {
                        sap.m.MessageToast.show("Advance payment has already done for this month");
                        return; // stop fragment open
                    }

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
                var fPaidAmount  = parseFloat(oNavigationModel.PaidAmount) || 0;

                // NEW: calculate balance amount
                var fBalanceAmount = fTotalAmount > fPaidAmount ? (fTotalAmount - fPaidAmount) : fTotalAmount;

                var oInvoicePaymentModel = this.getView().getModel("InvoicePayment");
                var fDueAmount = 0;

                if (oInvoicePaymentModel && oInvoicePaymentModel.getData().length !== 0) {
                    fDueAmount = parseFloat(oInvoicePaymentModel.getProperty("/AllDueAmount")) || fBalanceAmount;
                } else {
                    fDueAmount = fBalanceAmount;
                }

                var oModel = new sap.ui.model.json.JSONModel({
                    InvNo: oNavigationModel.InvNo,
                    TransactionId: "",
                    ReceivedDate: "",
                    ReceivedAmount: "",
                    TotalAmount: fBalanceAmount.toFixed(2),
                    DueAmount: fDueAmount.toFixed(2),
                    Currency: oNavigationModel.Currency,
                    ConversionRate: "",
                    AmountInINR: "",
                    FlagVisCompany: "Company Invoice",
                    CustomerName: oNavigationModel.CustomerName,
                    CustomerID: oNavigationModel.CustomerID,
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

                var totalReceivedAmount = 0;
                if (allPaymentData) {
                    totalReceivedAmount = allPaymentData.getProperty("/AllReceivedAmount");
                }

                var sValue = paymentModel.getProperty("/ReceivedAmount") || "";
                sValue = sValue.replaceAll(',', '');
                paymentModel.setProperty("/ReceivedAmount", sValue);

                var totalAmount = parseFloat(paymentModel.getProperty("/TotalAmount")) || 0;
                var receivedAmount = parseFloat(sValue) || 0;

                var dueAmount = totalAmount - totalReceivedAmount - receivedAmount;
                paymentModel.setProperty("/DueAmount", dueAmount.toFixed(2));
                this.onChangePaymentConvertionRate();

                if (oEvent) {
                    var enteredAmount = parseFloat(oEvent.getParameter("value").replaceAll(',', '')) || 0;
                    var dueAmount = parseFloat(this.DueAmount);
                    this.ResivedAmount = true;
                    if (enteredAmount === dueAmount) {
                        sap.ui.getCore().byId("idReceivedAmount").setValueState("None");
                    } else if (enteredAmount > dueAmount) {
                        this.ResivedAmount = false;
                        sap.ui.getCore().byId("idReceivedAmount").setValueState("Error");
                        sap.ui.getCore().byId("idReceivedAmount").setValueStateText(this.i18nModel.getText("invoiceRecievedAmountMessage"));
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
                var receivedAmount = parseFloat(oModelData.getData().ReceivedAmount);
                var conversionRate = parseFloat(oModelData.getData().ConversionRate);
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
                const totalReceivedAmount = items.reduce((sum, item) => sum + (parseFloat(item.ReceivedAmount) || 0), 0);

                const totalAmount = parseFloat(items[0]?.TotalAmount || 0);
                const totalDueAmount = totalAmount - totalReceivedAmount;

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

                sap.ui.core.BusyIndicator.show(0);
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
                    CustomerID: paymentModel.CustomerID,
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
                        this.Readcall("HM_InvoicePaymentDetail", {
                            InvNo: this.decodedPath
                        });
                        this.Readcall("HM_ManageInvoice", {
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

                        this.byId("CID_id_TableInvoiceItem").setMode("None");
                        MessageToast.show(this.i18nModel.getText("paymentMessage"));
                    }
                } catch (error) {
                    MessageToast.show(error.responseText);
                } finally {
                    sap.ui.core.BusyIndicator.hide();
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

            CID_onPressDelete: function(oEvent) {
                var that = this;
                var oModel = this.getView().getModel("ManageInvoiceItemModel");
                var oContext = oEvent.getParameter("listItem").getBindingContext("ManageInvoiceItemModel");
                var sIndex = oContext.getPath().split("/")[2];
                var aData = oModel.getData().ManageInvoiceItem;
                if (oContext.getObject().ItemID) {
                    this.showConfirmationDialog(
                        that.i18nModel.getText("msgBoxConfirm"),
                        that.i18nModel.getText("msgBoxConfirmDelete"),
                        function() {
                            that.getBusyDialog();
                            that.ajaxDeleteWithJQuery("/HM_ManageInvoiceItem", {
                                filters: {
                                    ItemID: oContext.getObject().ItemID
                                }
                            }).then(() => {

                                aData.splice(sIndex, 1);
                                aData.forEach((item, idx) => item.IndexNo = idx + 1);

                                oModel.setProperty("/ManageInvoiceItem", aData);
                                that.SNoValue = aData.length;
                                that.totalAmountCalculation();
                                MessageToast.show(that.i18nModel.getText("ManageInvoiceDeleteSuccess"));
                                that.closeBusyDialog();

                            }).catch((error) => {
                                that.closeBusyDialog();
                                MessageToast.show(error.responseText);
                            });
                        },
                        function() {
                            that.closeBusyDialog();
                        }
                    );
                } else {
                    aData.splice(sIndex, 1);
                    aData.forEach((item, idx) => item.IndexNo = idx + 1);
                    oModel.setProperty("/ManageInvoiceItem", aData);
                    this.SNoValue = aData.length;
                    this.totalAmountCalculation();
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
                    Subject: `SHAH HOSTEL - INVOICE PAYMENT REMINDER`,
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
                        <p style="margin:0;">Shah Hostel</p>
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
                    sap.ui.core.BusyIndicator.show(0);
                    this.ajaxCreateWithJQuery("CompanyInvoiceEmail", oPayload).then((oData) => {
                        MessageToast.show(this.i18nModel.getText("emailSuccess"));
                        sap.ui.core.BusyIndicator.hide();
                        SelectedModel.setProperty("/Status", "Invoice Sent");
                        SelectedModel.refresh(true);
                        this.loginModel.setProperty("/RichText", false);
                        this.loginModel.setProperty("/SimpleForm", true);
                    }).catch((error) => {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(error.responseText);
                    });
                    this.Mail_onPressClose();
                } catch (error) {
                    sap.ui.core.BusyIndicator.hide();
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
                    sap.ui.core.BusyIndicator.show(0);
                    const { jsPDF } = window.jspdf;
                    const oView = this.getView();
                    const oModel = oView.getModel("SelectedCustomerModel").getData();
                    const oManageInvoiceItemModel = oView.getModel("ManageInvoiceItemModel").getData();
                    const oCompanyItemModel = oManageInvoiceItemModel.ManageInvoiceItem || [];
                    var data = this.getView().getModel("FilteredSOWModel").getData();
                    var paymentModel = this.getView().getModel("InvoicePayment");
                    var allDueAmount = paymentModel ? (paymentModel.getProperty("/AllDueAmount") || 0) : 0;
                    var AllReceivedAmount = paymentModel ? (paymentModel.getProperty("/AllReceivedAmount") || 0) : 0;

                    // fetch company details
                    let filter = { BranchID: [oModel.BranchCode] };
                    const oCompanyDetailsModel = await this.ajaxReadWithJQuery("HM_Branch", filter);
                    const companyImage = oCompanyDetailsModel.data[0].Photo1;

                    let paymentTermsFilter = { InvNo: [oModel.InvNo] };
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
                        doc.text("TAX - INVOICE", pageWidth - 18, headerMargin, { align: "right" });
                    } else {
                        doc.text("DRAFT INVOICE", pageWidth - 18, headerMargin, { align: "right" });
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
                            value: typeof oModel.InvoiceDate === "string" ? oModel.InvoiceDate : Formatter.formatDate(oModel.InvoiceDate)
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
                    if (oModel.GST) {
                        doc.text(`GSTIN : ${oModel.GST}`, margin, currentY);
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
                            Formatter.fromatNumber(parseFloat(oModel.CouponDiscount))
                        ]);
                    }

                    if (data.Currency !== "USD" && oModel.Type) {
                        const percentageText = oModel.Value && oModel.Value !== "0" ? `(${oModel.Value}%)` : "";

                        const cgstValue = parseFloat(oModel.CGST);
                        const sgstValue = parseFloat(oModel.SGST);
                        const igstValue = parseFloat(oModel.IGST);

                        if (data.Currency === "INR" && oModel.Type === "CGST/SGST" && cgstValue
                        ) {
                            summaryBody.push([`CGST ${percentageText} :`, Formatter.fromatNumber(cgstValue.toFixed(2))]);
                            summaryBody.push([`SGST ${percentageText} :`, Formatter.fromatNumber(sgstValue.toFixed(2))]);
                        }

                        if (data.Currency === "INR" && oModel.Type === "IGST" && igstValue
                        ) {
                            summaryBody.push([`IGST ${percentageText} :`, Formatter.fromatNumber(igstValue.toFixed(2))]);
                        }
                    }

                    if (data.RoundOf && data.RoundOf !== "0") {
                        summaryBody.push([`Round Off (${data.Currency}) :`, data.RoundOf]);
                    }

                    if (parseFloat(allDueAmount) > 0) {
                        summaryBody.push([`Due Amount (${data.Currency}) :`, allDueAmount]);
                    }

                    if (parseFloat(AllReceivedAmount) > 0) {
                        summaryBody.push([`Received Amount (${data.Currency}) :`, AllReceivedAmount]);
                    }

                    if (parseFloat(data.BalanceAmount) > 0) {
                        summaryBody.push([`Due Amount (${data.Currency}) :`, data.BalanceAmount]);
                    }

                    const totalRowIndex = summaryBody.length;
                    summaryBody.push([`Total (${data.Currency}) :`, Formatter.fromatNumber(parseFloat(oModel.TotalAmount))]);

                    doc.autoTable({
                        startY: currentY,
                        head: [],
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

                    // ===== CUSTOMER TRANSACTION HISTORY =====
                    if (paymentdata && paymentdata.commentData && paymentdata.commentData.length > 0) {

                        // Page break check
                        if (currentY + 50 > pageHeight) {
                            doc.addPage();
                            currentY = 20;
                        }

                        doc.setFont("times", "bold").setFontSize(11);
                        doc.text("Customer Transaction History", margin, currentY);

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
                            head: [['Sl.No', 'Date', 'Payment Type', 'Bank / Mode', 'Transaction ID', 'Amount', 'Currency']],
                            body: paymentBody,
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
                                1: { halign: "center" },
                                2: { halign: "left" },
                                3: { halign: "left" },
                                4: { halign: "left" },
                                5: { halign: "right" }
                            }
                        });

                        currentY = doc.lastAutoTable.finalY + 8;
                    }

                    currentY += 15;
                    doc.setFontSize(11);
                    doc.text("Thank you for staying with us.", margin - 2, currentY);

                    const totalPages = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        doc.setPage(i);
                        this.addFooter(doc, oCompanyDetailsModel, pageWidth, pageHeight, i, totalPages);
                    }

                    doc.save(`${oModel.CustomerName}-${oModel.InvNo}-Invoice.pdf`);
                } catch (error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(error.message || error.responseText);
                } finally {
                    sap.ui.core.BusyIndicator.hide();
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
            }
        });
    });