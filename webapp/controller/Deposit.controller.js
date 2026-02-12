sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "../model/formatter",
    "../utils/validation",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, Fragment, MessageBox, Spreadsheet, exportLibrary, Formatter, utils, MessageToast) {
    "use strict";

    var EdmType = exportLibrary.EdmType;

    return BaseController.extend("sap.ui.com.project1.controller.Deposit", {
        Formatter: Formatter,
        _isDateRangeCleared: false,
        utils: utils, // Add utils reference

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDeposit").attachPatternMatched(this._onRouteMatched, this);

            // View model for dialog state
            var oViewModel = new JSONModel({
                DialogMode: "Return",
                CurrentDeposit: {},
                IsReturnMode: true
            });
            this.getView().setModel(oViewModel, "DepositView");

            if (!this.getView().getModel("DepositModel")) {
                this.getView().setModel(new JSONModel([]), "DepositModel");
            }
            // Initialize filter models
            this.getView().setModel(new JSONModel([]), "CustomerFilterModel");
            this.getView().setModel(new JSONModel([]), "BookingFilterModel");
        },
        _getUniqueValuesFromDepositData: function (propertyName) {
            const oModel = this.getView().getModel("DepositModel");
            const aData = oModel.getData();

            if (!Array.isArray(aData) || aData.length === 0) {
                return [];
            }

            // Extract unique values for the given property
            const uniqueValues = [];
            const seen = new Set();

            aData.forEach(item => {
                const value = item[propertyName];
                if (value && value.trim() && !seen.has(value)) {
                    seen.add(value);
                    uniqueValues.push({
                        key: value,
                        text: value,
                        ...(propertyName === 'BookingID' && { additionalText: item.CustomerName })
                    });
                }
            });

            // Sort alphabetically
            uniqueValues.sort((a, b) => a.text.localeCompare(b.text));

            return uniqueValues;
        },
        onHome: function () {
            const oUser = this._oLoggedInUser;
            const oUIModel = this.getOwnerComponent().getModel("UIModel");

            if (oUser && oUser.UserID) {
                oUIModel.setProperty("/isLoggedIn", true);
            } else {
                oUIModel.setProperty("/isLoggedIn", false);
            }

            this.getOwnerComponent()
                .getRouter()
                .navTo("RouteHostel", {}, true);
        },

        _onRouteMatched: async function () {
            const ok = await this.commonLoginFunction();
            if (!ok) return;

            // Bind LoginModel to the view
            const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
            if (oLoginModel) {
                this.getView().setModel(
                    new sap.ui.model.json.JSONModel(oLoginModel.getData()),
                    "LoginModel"
                );
                this._oLoggedInUser = oLoginModel.getData();
            } else {
                this._oLoggedInUser = {};
            }

            // Load branches and set up permissions
            await this._loadBranchCode();
            this._buildBranchMap();
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

            const sBRModel = this.getView().getModel("Branchmodel").getData();
            this._allowedBranches = sBRModel
                .map(item => item.BranchID)
                .join(",");

            // Set default date range to current financial year
            const { fyStart, fyEnd } = this._getFinancialYearDates();
            const oRange = this.byId("fDepositRange");

            if (oRange) {
                oRange.setDateValue(fyStart);
                oRange.setSecondDateValue(fyEnd);
            }

            this._isDateRangeCleared = false;

            // Load initial data
            await this.onDepositSearch();
        },

        _loadBranchCode: async function () {
            sap.ui.core.BusyIndicator.show(0);

            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            let aBranchCodes = "";

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode;
            }

            let filters = {};

            if (oExistingModel.Role === "Admin" && aBranchCodes) {
                filters.BranchID = aBranchCodes;
            }
            if (oExistingModel.Role === "Admin") {
                filters.BranchID = aBranchCodes;
                filters.Role = "Admin";
            } else {
                filters.BranchID = "";
            }

            try {
                const oView = this.getView();
                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                oView.setModel(oBranchModel, "Branchmodel");
            } catch (err) {
                console.error("Error while loading branch data:", err);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _buildBranchMap: function () {
            const aBranches = this.getView().getModel("Branchmodel").getData() || [];
            this._branchMap = {};

            aBranches.forEach(b => {
                this._branchMap[b.BranchID] = b.Name;
            });
        },

        _getFinancialYearDates: function () {
            const now = new Date();
            const currentYear = now.getFullYear();

            let fyStart, fyEnd;

            // FY = April 1 → March 31
            if (now.getMonth() >= 3) {
                fyStart = new Date(currentYear, 3, 1);      // April 1 (this year)
                fyEnd = new Date(currentYear + 1, 2, 31); // March 31 (next year)
            } else {
                fyStart = new Date(currentYear - 1, 3, 1);  // April 1 (last year)
                fyEnd = new Date(currentYear, 2, 31);     // March 31 (this year)
            }

            fyStart.setHours(0, 0, 0, 0);
            fyEnd.setHours(0, 0, 0, 0);

            return { fyStart, fyEnd };
        },

        onDepositSearch: async function () {
            try {
                sap.ui.core.BusyIndicator.show(0);

                const oFilterBar = this.byId("depositFilterBar");
                const aItems = oFilterBar.getFilterGroupItems();
                const oDepositRange = this.byId("fDepositRange");
                const oReturnRange = this.byId("fReturnRange");

                const params = {};

                // ================= Branch Logic =================
                params.BranchCode = this._allowedBranches;

                const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
                if (oExistingModel.Role === "Admin") {
                    params.Role = "Admin";
                }

                // ================= Date Format =================
                const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                    pattern: "yyyy-MM-dd"
                });

                let sDepositStartDate, sDepositEndDate;
                let sReturnStartDate, sReturnEndDate;

                // ================= Deposit Date Handling =================
                if (this._isDateRangeCleared === true) {
                    // Clear → fetch all data
                    delete params.DepositDate;
                    // Also clear the date range from UI state
                    if (oDepositRange) {
                        oDepositRange.setValue("");
                        oDepositRange.setDateValue(null);
                        oDepositRange.setSecondDateValue(null);
                    }
                } else if (oDepositRange) {
                    const oStartDate = oDepositRange.getDateValue();
                    const oEndDate = oDepositRange.getSecondDateValue();

                    if (oStartDate && oEndDate) {
                        // User selected date range
                        sDepositStartDate = oDateFormat.format(oStartDate);
                        sDepositEndDate = oDateFormat.format(oEndDate);
                    } else {
                        // Default → Financial Year
                        const { fyStart, fyEnd } = this._getFinancialYearDates();

                        sDepositStartDate = oDateFormat.format(fyStart);
                        sDepositEndDate = oDateFormat.format(fyEnd);

                        // Sync UI
                        oDepositRange.setDateValue(fyStart);
                        oDepositRange.setSecondDateValue(fyEnd);
                    }
                }

                // Set deposit date parameters if we have them
                if (sDepositStartDate && sDepositEndDate) {
                    // Send as array [startDate, endDate] - this is what backend expects
                    params.DepositDate = [sDepositStartDate, sDepositEndDate];
                }

                // ================= Return Date Handling =================
                if (oReturnRange) {
                    const oStartDate = oReturnRange.getDateValue();
                    const oEndDate = oReturnRange.getSecondDateValue();

                    if (oStartDate && oEndDate) {
                        sReturnStartDate = oDateFormat.format(oStartDate);
                        sReturnEndDate = oDateFormat.format(oEndDate);
                    }
                }

                // Set return date parameters if we have them
                if (sReturnStartDate && sReturnEndDate) {
                    // Send as array [startDate, endDate] - this is what backend expects
                    params.ReturnDepositDate = [sReturnStartDate, sReturnEndDate];
                }

                // ================= Other Filters =================
                // ================= Other Filters =================
                aItems.forEach(item => {
                    const ctrl = item.getControl();
                    const key = item.getName();
                    if (!ctrl) return;

                    switch (key) {
                        case "Status": {
                            const val = ctrl.getSelectedKey ? ctrl.getSelectedKey() : ctrl.getValue();
                            if (val && val.trim()) {
                                params[key] = val.trim();
                            }
                            break;
                        }

                        case "BranchCode": {
                            const val = ctrl.getSelectedKey?.();
                            if (val && val.trim()) {
                                params[key] = val.trim();
                            }
                            break;
                        }

                        case "CustomerName": {
                            const val = ctrl.getSelectedKey?.();
                            if (val && val.trim()) {
                                params[key] = val.trim();
                            }
                            break;
                        }

                        case "BookingID": {
                            const val = ctrl.getSelectedKey?.();
                            if (val && val.trim()) {
                                params[key] = val.trim();
                            }
                            break;
                        }
                    }
                });

                // ================= Branch Specific Logic =================
                const oBranchCB = this.byId("DfBranch");
                if (oBranchCB) {
                    const sValue = oBranchCB.getValue()?.trim();
                    const sSelectedKey = oBranchCB.getSelectedKey();

                    // 🟢 Case 1: user did NOT touch the field at all
                    if (!sValue && !sSelectedKey) {
                        // keep default allowed branches (already set)
                    }
                    // 🔴 Case 3: user typed something but did NOT select a valid branch
                    else if (sValue && !sSelectedKey) {
                        params.BranchCode = "__INVALID__"; // force no data
                    }
                    // 🟢 Case 2: valid branch selected
                    else if (this._allowedBranches?.split(",").includes(sSelectedKey)) {
                        params.BranchCode = sSelectedKey;
                    } else {
                        params.BranchCode = "__INVALID__";
                    }
                }

                // ================= Status Filter =================
                const oStatusCB = this.byId("DfStatus");
                if (oStatusCB) {
                    const sStatus = oStatusCB.getSelectedKey();
                    if (sStatus && sStatus.trim()) {
                        params.Status = sStatus.trim();
                    }
                }


                // ================= API Call =================
                const oResult = await this.ajaxReadWithJQuery("HM_Deposit", params);


                // ================= Normalize Data =================
                const aData = this._normalizeDepositResult(oResult);


                // ================= Client-side Filtering (Fallback) =================
                let filteredData = aData;

                // 1. Status filter (if any)
                if (params.Status) {
                    filteredData = filteredData.filter(deposit => deposit.Status === params.Status);
                }

                // 2. Client-side deposit date filtering (if backend didn't filter properly)
                if (sDepositStartDate && sDepositEndDate && filteredData.length > 0) {
                    const depositStartDate = new Date(sDepositStartDate);
                    const depositEndDate = new Date(sDepositEndDate);
                    depositEndDate.setHours(23, 59, 59, 999); // Include entire end day

                    const beforeFilterCount = filteredData.length;

                    filteredData = filteredData.filter(deposit => {
                        if (!deposit.DepositDate) return false;

                        try {
                            const depositDate = new Date(deposit.DepositDate);
                            return depositDate >= depositStartDate && depositDate <= depositEndDate;
                        } catch (e) {
                            console.warn("Invalid deposit date:", deposit.DepositDate);
                            return false;
                        }
                    });

                    if (beforeFilterCount !== filteredData.length) {
                    }
                }

                // 3. Client-side return date filtering (if backend didn't filter properly)
                if (sReturnStartDate && sReturnEndDate && filteredData.length > 0) {
                    const returnStartDate = new Date(sReturnStartDate);
                    const returnEndDate = new Date(sReturnEndDate);
                    returnEndDate.setHours(23, 59, 59, 999); // Include entire end day

                    const beforeFilterCount = filteredData.length;

                    filteredData = filteredData.filter(deposit => {
                        if (!deposit.ReturnDepositDate) {
                            // If no return date and we're filtering by return date, exclude it
                            return false;
                        }

                        try {
                            const returnDate = new Date(deposit.ReturnDepositDate);
                            return returnDate >= returnStartDate && returnDate <= returnEndDate;
                        } catch (e) {
                            console.warn("Invalid return date:", deposit.ReturnDepositDate);
                            return false;
                        }
                    });

                    if (beforeFilterCount !== filteredData.length) {
                    }
                }

                // ================= Calculate Status =================
                filteredData.forEach(deposit => {
                    // SIMPLIFIED STATUS LOGIC: Only "Pending" or "
                    const depositAmount = parseFloat(deposit.DepositAmount || 0);
                    const returnAmount = parseFloat(deposit.ReturnDepositAmount || 0);

                    // Simple binary logic
                    deposit.Status = returnAmount > 0 ? "Returned" : "Received";
                });

                // ================= Update Model =================
                this.getView().getModel("DepositModel").setData(filteredData);

                // After this line:
                this.getView().getModel("DepositModel").setData(filteredData);

                // Add these lines to populate comboboxes:
                this._refreshFilterComboBoxes(filteredData);

            } catch (err) {
                console.error("Failed to load deposit data:", err);
                sap.m.MessageBox.error(
                    err?.responseJSON?.message ||
                    err?.message ||
                    "Failed to load deposit data."
                );
            } finally {
                sap.ui.core.BusyIndicator.hide();
                this._isDateRangeCleared = false;
            }
        },

        _normalizeDepositResult: function (oResult) {
            let aData = [];

            if (oResult && oResult.commentData && Array.isArray(oResult.commentData)) {
                aData = oResult.commentData;
            } else if (oResult && oResult.data && Array.isArray(oResult.data)) {
                aData = oResult.data;
            } else if (oResult && oResult.data && !Array.isArray(oResult.data)) {
                aData = [oResult.data];
            }


            // Normalize data with simplified status logic
            return aData.map(d => {
                // Parse amounts as numbers
                const depositAmt = parseFloat(d.DepositAmount || 0);
                const returnAmt = parseFloat(d.ReturnDepositAmount || 0);

                // SIMPLIFIED STATUS: Returned if any amount returned, otherwise Pending
                const status = returnAmt > 0 ? "Returned" : "Pending";

                // Get branch name from branch map (populated from HM_BranchData)
                const branchName = this._branchMap[d.BranchCode] || d.BranchCode || "-";

                return {
                    ...d,
                    DepositDate: d.DepositDate?.slice(0, 10),
                    ReturnDepositDate: d.ReturnDepositDate?.slice(0, 10),
                    DepositAmount: depositAmt.toString(),
                    ReturnDepositAmount: returnAmt.toString(),
                    DepositCurrency: d.DepositCurrency || "INR",
                    ReturnDepositCurrency: d.ReturnDepositCurrency || "INR",
                    Status: status, // Simplified binary status
                    BranchName: branchName, // Add branch name here
                    BranchCodeDisplay: d.BranchCode // Keep branch code for display if needed
                };
            });
        },
        _refreshFilterComboBoxes: function (aData) {
            // Extract unique customer names
            const uniqueCustomers = [];
            const seenCustomers = new Set();

            // Extract unique booking IDs
            const uniqueBookings = [];
            const seenBookings = new Set();

            aData.forEach(item => {
                // Customer Name
                if (item.CustomerName && item.CustomerName.trim() && !seenCustomers.has(item.CustomerName)) {
                    seenCustomers.add(item.CustomerName);
                    uniqueCustomers.push({
                        key: item.CustomerName,
                        text: item.CustomerName
                    });
                }

                // Booking ID
                if (item.BookingID && item.BookingID.trim() && !seenBookings.has(item.BookingID)) {
                    seenBookings.add(item.BookingID);
                    uniqueBookings.push({
                        key: item.BookingID,
                        text: item.BookingID,
                        additionalText: item.CustomerName || ""
                    });
                }
            });

            // Sort alphabetically
            uniqueCustomers.sort((a, b) => a.text.localeCompare(b.text));
            uniqueBookings.sort((a, b) => a.text.localeCompare(b.text));

            // Create models for comboboxes
            const oCustomerModel = new JSONModel(uniqueCustomers);
            const oBookingModel = new JSONModel(uniqueBookings);

            // Set models to the view
            this.getView().setModel(oCustomerModel, "CustomerFilterModel");
            this.getView().setModel(oBookingModel, "BookingFilterModel");
        },
        onClearDeposits: function () {
            this.byId("DfStatus").setSelectedKey("");
            this.byId("DfBranch").setSelectedKey("");

            // Clear comboboxes instead of input fields
            this.byId("DfCustomerName").setSelectedKey("");
            this.byId("DfBookingID").setSelectedKey("");

            // Clear date ranges
            const oDepositRange = this.byId("fDepositRange");
            const oReturnRange = this.byId("fReturnRange");

            if (oDepositRange) {
                oDepositRange.setValue("");
                oDepositRange.setDateValue(null);
                oDepositRange.setSecondDateValue(null);
            }

            if (oReturnRange) {
                oReturnRange.setValue("");
                oReturnRange.setDateValue(null);
                oReturnRange.setSecondDateValue(null);
            }

            this._isDateRangeCleared = true;
        },

        // ================= CRUD Operations =================

        onReturnDeposit: function () {
            var oTable = this.byId("depositTable");
            var aSel = oTable.getSelectedItems();

            if (!aSel || aSel.length !== 1) {
                MessageToast.show("Please select exactly one deposit to return.");
                return;
            }

            var oItem = aSel[0];
            var oCtx = oItem.getBindingContext("DepositModel");
            var oData = Object.assign({}, oCtx.getObject());

            // Check if deposit can be returned
            if (oData.Status === "Returned") {
                MessageToast.show("This deposit has already been returned.");
                return;
            }

            // Parse amounts and get currency
            const depositAmount = parseFloat(oData.DepositAmount || 0);
            const depositCurrency = oData.DepositCurrency || "INR";

            var oViewModel = this.getView().getModel("DepositView");
            oViewModel.setProperty("/DialogMode", "Return");
            oViewModel.setProperty("/IsReturnMode", true);

            // Include deposit currency in the data
            oViewModel.setProperty("/CurrentDeposit", {
                ...oData,
                DepositAmount: depositAmount.toFixed(2),
                DepositCurrency: depositCurrency, // Ensure currency is included
                ReturnDepositAmount: "", // START EMPTY - user will enter manually
                ReturnDepositCurrency: depositCurrency, // Use same currency for return
                ReturnDepositMode: "",
                ReturnDepositTransactionID: ""
            });



            this._openDepositReturnDialog();
        },
        onDownloadDeposits: function () {
            var oTable = this.byId("depositTable");
            var oModel = oTable.getModel("DepositModel");
            var oData = oModel.getData();

            var aData = Array.isArray(oData)
                ? oData
                : oData?.results || [];

            if (aData.length === 0) {
                sap.m.MessageToast.show("No deposits available to download");
                return;
            }

            const aFormattedData = aData.map(item => ({
                ...item,
                DepositDate: Formatter.formatDate(item.DepositDate),
                ReturnDepositDate: Formatter.formatDate(item.ReturnDepositDate)
            }));

            var aCols = this._createDepositColumnConfig();

            var oSheet = new Spreadsheet({
                workbook: { columns: aCols },
                dataSource: aFormattedData,
                fileName: "Deposits.xlsx"
            });

            oSheet.build()
                .finally(() => oSheet.destroy());
        },

        _createDepositColumnConfig: function () {
            return [
                { label: "Booking ID", property: "BookingID", type: "String" },
                { label: "Customer Name", property: "CustomerName", type: "String" },
                { label: "Deposit Amount", property: "DepositAmount", type: "Number" },
                { label: "Deposit Currency", property: "DepositCurrency", type: "String" },
                { label: "Deposit Date", property: "DepositDate", type: "String" },
                { label: "Deposit Mode", property: "DepositMode", type: "String" },
                { label: "Transaction ID", property: "DepositTransactionID", type: "String" },
                { label: "Deposit Taken By", property: "DepositTakenBy", type: "String" },
                { label: "Return Amount", property: "ReturnDepositAmount", type: "Number" },
                { label: "Return Currency", property: "ReturnDepositCurrency", type: "String" },
                { label: "Return Date", property: "ReturnDepositDate", type: "String" },
                { label: "Return Mode", property: "ReturnDepositMode", type: "String" },
                { label: "Return Transaction ID", property: "ReturnDepositTransactionID", type: "String" },
                { label: "Return Deposit By", property: "ReturnDepositBy", type: "String" },
                { label: "Branch Code", property: "BranchCode", type: "String" },
                { label: "Branch Name", property: "BranchName", type: "String" }, // NEW COLUMN
                { label: "Status", property: "Status", type: "String" }
            ];
        },

        _openDepositReturnDialog: async function () {
            const oView = this.getView();

            if (!this._oReturnDialog) {
                this._oReturnDialog = await Fragment.load({
                    id: oView.getId(),
                    name: "sap.ui.com.project1.fragment.DepositReturnDialog",
                    controller: this
                });
                oView.addDependent(this._oReturnDialog);
            }

            this._oReturnDialog.open();

            // Initialize Transaction ID field state based on current mode
            this._initializeTransactionIDState();
        },

        _initializeTransactionIDState: function () {
            const oView = this.getView();
            const oTransactionIDInput = sap.ui.getCore().byId(oView.createId("inReturnTransactionID"));
            const oModeInput = sap.ui.getCore().byId(oView.createId("inReturnMode"));

            if (oModeInput && oTransactionIDInput) {
                const currentMode = oModeInput.getSelectedKey() || oModeInput.getValue();

                if (currentMode === "CASH") {
                    oTransactionIDInput.setEnabled(false);
                    oTransactionIDInput.setValue(""); // Clear any existing value
                } else {
                    oTransactionIDInput.setEnabled(true);
                }
            }
        },
        onSaveReturn: async function () {
            var oView = this.getView();
            var oVM = oView.getModel("DepositView");
            var oDeposit = Object.assign({}, oVM.getProperty("/CurrentDeposit"));
            var sBookingID = oDeposit?.BookingID || "";

            // Validate return fields
            if (!this._validateReturnFields()) {
                MessageToast.show("Please correct validation errors");
                return;
            }

            // Get return amount from the input field (user-edited)
            const oReturnAmountInput = sap.ui.getCore().byId(oView.createId("inReturnAmount"));
            const userEnteredAmount = oReturnAmountInput.getValue();
            const newReturnAmount = parseFloat(userEnteredAmount || 0);

            // SIMPLE: Just basic validation
            if (!userEnteredAmount || userEnteredAmount.trim() === "") {
                MessageToast.show("Please enter return amount");
                return;
            }

            if (newReturnAmount < 0) {
                MessageToast.show("Return amount cannot be negative");
                return;
            }

            // Get deposit amount and currency
            const depositAmount = parseFloat(oDeposit.DepositAmount || 0);
            const depositCurrency = oDeposit.DepositCurrency || "INR";

            if (newReturnAmount > depositAmount) {
                MessageToast.show(`Return amount cannot exceed ${depositAmount.toFixed(2)}`);
                return;
            }

            // Get Return Mode from input
            const oReturnModeInput = sap.ui.getCore().byId(oView.createId("inReturnMode"));

            // Validate combobox using strict validation
            const isModeValid = this.utils._LCstrictValidationComboBox(oReturnModeInput, "ID");
            if (!isModeValid) {
                MessageToast.show("Please select a valid return mode");
                return;
            }

            const returnMode = oReturnModeInput ? oReturnModeInput.getSelectedKey() || oReturnModeInput.getValue() : "";

            // Get Transaction ID (field might be disabled for CASH)
            const oTransactionIDInput = sap.ui.getCore().byId(oView.createId("inReturnTransactionID"));
            const transactionID = oTransactionIDInput ? oTransactionIDInput.getValue() : "";

            // Validate transaction ID only for non-cash transactions AND when field is enabled
            if (returnMode !== "CASH" && oTransactionIDInput && oTransactionIDInput.getEnabled()) {
                if (!transactionID || transactionID.trim() === "") {
                    oTransactionIDInput.setValueState("Error");
                    MessageToast.show("Transaction ID is required for non-cash transactions");
                    return;
                }
            }

            sap.ui.core.BusyIndicator.show(0);
            try {
                // Always set status to Returned if any amount is being returned
                const newStatus = "Returned";

                // Get current user
                const oLoginModel = oView.getModel("LoginModel");
                const currentUser = oLoginModel ? oLoginModel.getProperty("/EmployeeName") : "System";

                // Prepare update data - USE SAME CURRENCY AS DEPOSIT
                const updateData = {
                    ReturnDepositAmount: newReturnAmount.toFixed(2),
                    ReturnDepositCurrency: depositCurrency, // Use deposit currency, not hardcoded INR
                    ReturnDepositDate: new Date().toISOString().slice(0, 10),
                    ReturnDepositMode: returnMode,
                    ReturnDepositTransactionID: transactionID || "",
                    ReturnDepositBy: currentUser,
                    BookingID:sBookingID
                    // Status: newStatus
                };

                // Call API with proper structure
                const apiPayload = {
                    filters: {
                        DepositID: oDeposit.DepositID
                    },
                    data: updateData
                };


                const response = await this.ajaxUpdateWithJQuery("HM_Deposit", apiPayload);


                if (response && response.success) {
                    MessageToast.show("Deposit returned successfully");
                } else {
                    throw new Error(response?.message || "Update failed");
                }

                if (this._oReturnDialog) {
                    this._oReturnDialog.close();
                }

                this._clearTableSelection();
                await this.onDepositSearch();

            } catch (err) {
                console.error("Error in onSaveReturn:", err);
                MessageBox.error(
                    err?.responseJSON?.message || err.message || "Failed to process deposit return."
                );
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },


        _validateReturnFields: function () {
            const oView = this.getView();

            // 1. Validate Return Amount first
            const oReturnAmount = sap.ui.getCore().byId(oView.createId("inReturnAmount"));
            if (oReturnAmount) {
                const userEnteredAmount = oReturnAmount.getValue();

                // Check if empty
                if (!userEnteredAmount || userEnteredAmount.trim() === "") {
                    oReturnAmount.setValueState("Error");
                    oReturnAmount.setValueStateText("Please enter return amount");
                    return false; // Stop here
                } else {
                    // Use validation utility for format
                    const amountValid = this.utils._LCvalidateAmount(oReturnAmount, "ID");
                    if (!amountValid) {
                        return false; // Stop here
                    } else {
                        // Check amount range
                        const newReturnAmount = parseFloat(userEnteredAmount);
                        const oVM = this.getView().getModel("DepositView");
                        const oDeposit = oVM.getProperty("/CurrentDeposit");
                        const depositAmount = parseFloat(oDeposit.DepositAmount || 0);

                        if (newReturnAmount > depositAmount) {
                            oReturnAmount.setValueState("Error");
                            oReturnAmount.setValueStateText(`Cannot exceed ${depositAmount.toFixed(2)}`);
                            return false; // Stop here
                        } else if (newReturnAmount < 0) {
                            oReturnAmount.setValueState("Error");
                            oReturnAmount.setValueStateText("Amount cannot be negative");
                            return false; // Stop here
                        } else {
                            oReturnAmount.setValueState("None");
                        }
                    }
                }
            }

            // 2. Validate Return Mode (only if amount passed)
            const oReturnMode = sap.ui.getCore().byId(oView.createId("inReturnMode"));
            if (oReturnMode) {
                // Use strict combobox validation
                const modeValid = this.utils._LCstrictValidationComboBox(oReturnMode, "ID");
                if (!modeValid) {
                    return false; // Stop here if mode is invalid
                }

                // 3. Validate Transaction ID if needed
                const returnMode = oReturnMode.getSelectedKey() || oReturnMode.getValue();
                const oTransactionID = sap.ui.getCore().byId(oView.createId("inReturnTransactionID"));

                // Only validate Transaction ID if mode is not CASH and field is enabled
                if (returnMode !== "CASH" && oTransactionID && oTransactionID.getEnabled()) {
                    const transactionID = oTransactionID.getValue();
                    if (!transactionID || transactionID.trim() === "") {
                        oTransactionID.setValueState("Error");
                        return false; // Stop here
                    } else {
                        oTransactionID.setValueState("None");
                    }
                } else if (oTransactionID) {
                    // For cash or disabled fields, clear any error state
                    oTransactionID.setValueState("None");
                }
            }

            return true;
        },
        _validateReturnAmount: function (oEvent) {
            const oInput = oEvent.getSource();
            const oView = this.getView();
            const oVM = oView.getModel("DepositView");
            const oDeposit = oVM.getProperty("/CurrentDeposit");

            const userEnteredAmount = oInput.getValue();
            const newReturnAmount = parseFloat(userEnteredAmount || 0);
            const depositAmount = parseFloat(oDeposit.DepositAmount || 0);

            // SIMPLE VALIDATION:
            // 1. If field is empty, show error
            if (!userEnteredAmount || userEnteredAmount.trim() === "") {
                oInput.setValueState("Error");
                oInput.setValueStateText("Please enter return amount");
                return false;
            }

            // 2. Use validation utility for format
            const isValid = utils._LCvalidateAmount(oInput, "ID");
            if (!isValid) {
                return false;
            }

            // 3. Check amount range (0 to deposit amount)
            if (newReturnAmount > depositAmount) {
                oInput.setValueState("Error");
                oInput.setValueStateText(`Amount cannot exceed ${depositAmount.toFixed(2)}`);
                return false;
            } else if (newReturnAmount < 0) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Amount cannot be negative");
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },

        _onReturnModeChange: function (oEvent) {
            const oModeInput = oEvent.getSource();
            const oView = this.getView();
            const oTransactionIDInput = sap.ui.getCore().byId(oView.createId("inReturnTransactionID"));

            // Validate only the combobox itself
            const isValid = this.utils._LCstrictValidationComboBox(oEvent, "EVENT");

            const returnMode = oModeInput.getSelectedKey() || oModeInput.getValue();

            // Update Transaction ID field state based on return mode
            if (oTransactionIDInput) {
                if (returnMode === "CASH") {
                    // Disable and clear validation for Transaction ID when CASH is selected
                    oTransactionIDInput.setEnabled(false);
                    oTransactionIDInput.setRequired(false);
                    oTransactionIDInput.setValueState("None");
                    oTransactionIDInput.setValue(""); // Clear any existing value
                } else {
                    // Enable for non-cash transactions
                    oTransactionIDInput.setEnabled(true);
                    oTransactionIDInput.setRequired(true);

                    // IMPORTANT: Don't validate Transaction ID here - just clear any existing error state
                    // Let the separate validation function handle it
                    oTransactionIDInput.setValueState("None");
                }
            }

            return isValid; // Return validation result of the combobox only
        },

        _validateTransactionID: function (oEvent) {
            const oInput = oEvent.getSource();
            const oView = this.getView();
            const oModeInput = sap.ui.getCore().byId(oView.createId("inReturnMode"));
            const returnMode = oModeInput ? (oModeInput.getSelectedKey() || oModeInput.getValue()) : "";

            // If CASH mode, no validation needed
            if (returnMode === "CASH") {
                oInput.setValueState("None");
                return true;
            }

            // For non-cash transactions, validate
            const value = oInput.getValue();
            if (!value || value.trim() === "") {
                oInput.setValueState("Error");
                return false;
            }

            oInput.setValueState("None");
            return true;
        },
     



        // This method should be called when opening the return dialog
        _onOpenReturnDialog: function (oDepositData) {
            const oView = this.getView();

            // Create dialog if it doesn't exist
            if (!this._oReturnDialog) {
                this._oReturnDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "your.namespace.fragment.DepositReturnDialog",
                    this
                );

                // Make the dialog dependent on the view
                oView.addDependent(this._oReturnDialog);
            }

            // Set the deposit data to the model
            const oDepositView = this.getView().getModel("DepositView");
            if (oDepositView && oDepositData) {
                oDepositView.setProperty("/CurrentDeposit", oDepositData);
            }

            // Clear any previous errors
            this._clearReturnDialogErrors();

            // Reset Transaction ID field state based on initial mode
            const oReturnMode = sap.ui.getCore().byId(oView.createId("inReturnMode"));
            const oTransactionID = sap.ui.getCore().byId(oView.createId("inReturnTransactionID"));

            if (oReturnMode && oTransactionID) {
                const returnMode = oReturnMode.getSelectedKey() || oReturnMode.getValue();
                if (returnMode === "CASH") {
                    oTransactionID.setEnabled(false);
                    oTransactionID.setRequired(false);
                    oTransactionID.setValueState("None");
                } else {
                    oTransactionID.setEnabled(true);
                    oTransactionID.setRequired(true);
                    oTransactionID.setValueState("None");
                }
            }

            // Open the dialog
            this._oReturnDialog.open();
        },

        // The existing clear errors method
        _clearReturnDialogErrors: function () {
            const oView = this.getView();

            // Clear Return Amount field
            const oReturnAmount = sap.ui.getCore().byId(oView.createId("inReturnAmount"));
            if (oReturnAmount) {
                oReturnAmount.setValueState("None");
                // oReturnAmount.setValueStateText("");
            }

            // Clear Return Mode field
            const oReturnMode = sap.ui.getCore().byId(oView.createId("inReturnMode"));
            if (oReturnMode) {
                oReturnMode.setValueState("None");
                // oReturnMode.setValueStateText("");
            }

            // Clear Transaction ID field
            const oTransactionID = sap.ui.getCore().byId(oView.createId("inReturnTransactionID"));
            if (oTransactionID) {
                oTransactionID.setValueState("None");
                // oTransactionID.setValueStateText("");
            }
        },


        onDialogEscape: function (oEvent) {
            // Clear errors first
            this._clearReturnDialogErrors();

            // Clear table selection
            this._clearTableSelection();

            if (this._oReturnDialog) {
                this._oReturnDialog.close();
            }

            // Prevent the default ESC key behavior
            if (oEvent) {
                oEvent.preventDefault();
            }
        },

        onDialogClose: function () {
            // Clear all errors from dialog fields
            this._clearReturnDialogErrors();

            // Clear table selection
            this._clearTableSelection();

            if (this._oReturnDialog) {
                this._oReturnDialog.close();
            }
        },

        // Also update onDialogAfterClose to clear selection
        onDialogAfterClose: function () {
            // Clear errors when dialog closes via any method
            this._clearReturnDialogErrors();

            // Clear table selection (in case dialog closed via other methods)
            this._clearTableSelection();

            // Clear the dialog data model if needed
            const oDepositView = this.getView().getModel("DepositView");
            if (oDepositView) {
                oDepositView.setProperty("/CurrentDeposit", {});
            }
        },

        // Add this new method to clear table selection
        _clearTableSelection: function () {
            const oTable = this.byId("depositTable"); // Use your actual table ID

            if (oTable) {
                // Method 1: If using sap.m.Table
                if (oTable.removeSelections) {
                    oTable.removeSelections();
                }

                // Method 2: If using sap.ui.table.Table
                if (oTable.clearSelection) {
                    oTable.clearSelection();
                }

                // Method 3: Set selected property to false on all rows
                if (oTable.getItems) {
                    const aItems = oTable.getItems();
                    aItems.forEach(function (oItem) {
                        if (oItem.setSelected) {
                            oItem.setSelected(false);
                        }
                    });
                }

            }
        },


        _clearTableSelection: function () {
            var oTable = this.byId("depositTable");
            if (oTable) {
                oTable.removeSelections(true);
            }
        },

        onDateRangeChange: function () {
            // Intentionally empty to prevent auto-search
        },

        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("TilePage", {}, true);
            }
        }
    });
});