sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "../model/formatter"
], function (BaseController, JSONModel, MessageToast, Fragment, formatter) {
    "use strict";
    const INITIAL_CHART_TYPES = {
        statusType: "donut",
        DailyType: "column",
        monthlyType: "bar",
        yearlyType: "bar"

    };
    return BaseController.extend("sap.ui.com.project1.controller.ComplainDashboard", {
        Formatter: formatter,

        _oGroupedInvoices: {},
        _aCurrentFilteredData: [],
        onInit: function () {
            const oChartData = {
                statusDistribution: [],
                monthlyValue: [],
                yearlyTrend: [],
                paymentBreakdown: [],
                dailyValue: []
            };
            this.getView().setModel(new JSONModel(oChartData), "chartData");
            this.getView().setModel(new JSONModel(INITIAL_CHART_TYPES), "ComplaintChartModel");
            this.getOwnerComponent().getRouter().getRoute("RouteComplainDashboard").attachMatched(this._onRouteMatched, this);
        },
        onNavBack: function () {
            if (this.sPath === "Complaindetails") {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteComplaintDetails");
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("TilePage");
            }
        },

        _onRouteMatched: async function (oEvent) {
            this.sPath = oEvent.getParameter("arguments").sPath;

            var LoginFunction = await this.commonLoginFunction("ComplainDashboard");
            if (!LoginFunction) return;
            this._ViewDatePickersReadOnly(["CD_branchFilter", "CD_complain_Date", "CD_statusFilter"], this.getView());
            this.Loginmodel = this.getOwnerComponent().getModel("LoginModel").getData()
            const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
            if (oLoginModel) {
                this._oLoggedInUser = oLoginModel.getData();
            } else {
                this._oLoggedInUser = {};
            }
            this.onClearAndSearch("CD_FilterBar");
            await this._loadBranchCode();
            this._buildBranchMap();
            this._setCurrentMonthDateRange();
            this._setCurrentMonthYear(); 
            this.readComplainData();
            //    this.ReadEmpData()
            var oVizFrame = this.getView().byId("CD_donutChartStatus");

            this.getView().getModel("ComplaintChartModel").setData(JSON.parse(JSON.stringify(INITIAL_CHART_TYPES)));
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("hostelDashboard"));
            this.byId("CD_donutChartStatus").vizSelection([], { clearSelection: true });

            var legendPosition = sap.ui.Device.system.phone ? "left" : "right";
            oVizFrame.setVizProperties({
                legend: {
                    position: legendPosition
                }
            });
        },
        _setCurrentMonthDateRange: function () {
            var oDateRange = this.byId("CD_complain_Date");

            var oToday = new Date();

            // First day of current month
            var oStartDate = new Date(oToday.getFullYear(), oToday.getMonth(), 1);

            // Last day of current month
            var oEndDate = new Date(oToday.getFullYear(), oToday.getMonth() + 1, 0);

            oDateRange.setDateValue(oStartDate);
            oDateRange.setSecondDateValue(oEndDate);
        },
        _setCurrentMonthYear: function () {

    const oMonthPicker = this.byId("CD_complain_Permonth");

    const today = new Date();

    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();

    const value = month + "/" + year;

    oMonthPicker.setValue(value);
},
onMonthChange: function (oEvent) {

    const oDate = oEvent.getSource().getDateValue();

    if (!oDate) {
        this._selectedMonth = null;
        return;
    }

    this._selectedMonth = {
        year: oDate.getFullYear(),
        month: oDate.getMonth()
    };

},

        _loadBranchCode: async function () {
            try {
                const oExistingModel = this.Loginmodel;
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
                } else if (oExistingModel.Role === "SuperAdmin") {
                    filters.BranchID = "";
                }
                else {
                    filters.BranchID = aBranchCodes;
                }

                const oView = this.getView();
                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                oView.setModel(oBranchModel, "Branchmodel");

                // Store allowed branches for filtering
                this._allowedBranches = aBranches
                    .map(item => item.BranchID)
                    .join(",");

            } catch (err) {
                console.error("Error while loading branch data:", err);
            }
        },

        _buildBranchMap: function () {
            const aBranches = this.getView().getModel("Branchmodel").getData() || [];
            this._branchMap = {};

            aBranches.forEach(b => {
                this._branchMap[b.BranchID] = b.Name;
            });
        },

        readComplainData: async function () {
            try {
                this.getBusyDialog()

                // Prepare filters based on role
                let ComplaintFilters = {};

                // If user is not SuperAdmin, filter by allowed branches
                if (this._oLoggedInUser?.Role !== "SuperAdmin" && this._allowedBranches) {
                    ComplaintFilters.BranchCode = this._allowedBranches;


                    // If user is Admin with specific role
                    if (this._oLoggedInUser?.Role === "Admin") {
                        ComplaintFilters.Role = "Admin";
                    }
                }

                const oData = await this.ajaxReadWithJQuery("HM_Complaint", ComplaintFilters);

                this.rawComplainData = Array.isArray(oData?.commentData)
                    ? oData.commentData
                    : [];

                // Build AssignedBy list (NO blanks, NO duplicates)
                const aAssignedBy = Array.from(
                    new Set(
                        this.rawComplainData
                            .map(item => item.AssignedBy)
                            .filter(v => v && v.trim() !== "")
                    )
                ).map(name => ({
                    AssignedBy: name
                }));

                // Create model ONLY for Assigned Staff filter
                const oAssignedStaffModel = new JSONModel(aAssignedBy);

                // Set model to view
                this.getView().setModel(oAssignedStaffModel, "AssignedStaffModel");

                // Keep complaint model if needed elsewhere
                this.getView().setModel(
                    new JSONModel(this.rawComplainData),
                    "ComplaintModel"
                );

                this.onFilterChange();
            } catch (error) {
                MessageToast.show(error.message || this.i18nModel.getText("technicalError"));
                this.closeBusyDialog()
            }
        },
        onHome: function () {
            this.CommonLogoutFunction();
        },
        _updateAssignedStaffByBranch: function (aFilteredByBranchData) {

            // Extract AssignedBy only from branch-filtered data
            const aAssignedBy = Array.from(
                new Set(
                    aFilteredByBranchData
                        .map(item => item.AssignedBy)
                        .filter(v => v && v.trim() !== "")
                )
            ).map(name => ({
                AssignedBy: name
            }));

            // Update model
            const oAssignedStaffModel = new JSONModel(aAssignedBy);
            this.getView().setModel(oAssignedStaffModel, "AssignedStaffModel");

            // Reset selection if current value is no longer valid
            const oCombo = this.byId("CD_assignedStaffFilter");
            const sSelectedKey = oCombo.getSelectedKey();

            if (sSelectedKey && !aAssignedBy.some(e => e.AssignedBy === sSelectedKey)) {
                oCombo.setSelectedKey("");
            }
        },
        onFilterChange: function () {

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (!this.rawComplainData) return;

            this.getBusyDialog()

    setTimeout(() => {

        try {

            const aRawData = [...this.rawComplainData];

            const aSelectedBranches = this.byId("CD_branchFilter").getSelectedKeys();
            const sSelectedStatus = this.byId("CD_statusFilter").getSelectedKey();
            const sAssignedBy = this.byId("CD_assignedStaffFilter").getSelectedKey();

            const oDateRange = this.byId("CD_complain_Date");
            const dFrom = oDateRange.getDateValue();
            const dTo = oDateRange.getSecondDateValue();

            const oMonthPicker = this.byId("CD_complain_Permonth");
            const oMonthDate = oMonthPicker.getDateValue();

            let selectedMonth = null;
            let selectedYear = null;

            if (oMonthDate) {
                selectedMonth = oMonthDate.getMonth();
                selectedYear = oMonthDate.getFullYear();
            }

            const aFilteredData = aRawData.filter(item => {

                // Branch filter
                if (aSelectedBranches.length > 0 &&
                    !aSelectedBranches.includes(item.BranchCode)) {
                    return false;
                }

                // Status filter
                if (sSelectedStatus && item.Status !== sSelectedStatus) {
                    return false;
                }

                // Assigned Staff filter
                if (sAssignedBy && item.AssignedBy !== sAssignedBy) {
                    return false;
                }

                const dItemDate = new Date(item.ComplaintRaisedDate || item.InvoiceDate);

                if (isNaN(dItemDate)) return false;

                dItemDate.setHours(0,0,0,0);

                // -------------------------------
                // MONTH FILTER (highest priority)
                // -------------------------------
                if (selectedMonth !== null && selectedYear !== null) {

                    if (
                        dItemDate.getFullYear() !== selectedYear ||
                        dItemDate.getMonth() !== selectedMonth
                    ) {
                        return false;
                    }

                }

                // -------------------------------
                // DATE RANGE FILTER
                // -------------------------------
                else if (dFrom && dTo) {

                    const from = new Date(dFrom);
                    const to = new Date(dTo);

                    from.setHours(0,0,0,0);
                    to.setHours(23,59,59,999);

                    if (dItemDate < from || dItemDate > to) {
                        return false;
                    }

                }

                // -------------------------------
                // DEFAULT CURRENT MONTH
                // -------------------------------
                else {

                    if (
                        dItemDate.getFullYear() !== currentYear ||
                        dItemDate.getMonth() !== currentMonth
                    ) {
                        return false;
                    }

                }

                return true;

            });

            // Map Branch Name
            aFilteredData.forEach(item => {

                item.BranchName =
                    (this._branchMap && this._branchMap[item.BranchCode]) ||
                    item.BranchCode ||
                    "Unknown";

            });

            this._aCurrentFilteredData = aFilteredData;

            this._aggregateAndSetAllChartData(aFilteredData, this.rawComplainData);

                } catch (e) {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                } finally {
                    this.closeBusyDialog()
                }
            }, 0);
        },
        onBranchChange: function () {
            if (!this.rawComplainData) return;
            const aSelectedBranches = this.byId("CD_branchFilter").getSelectedKeys();

            // Filter ONLY by branch
            const aBranchFilteredData = this.rawComplainData.filter(item =>
                aSelectedBranches.length === 0 ||
                aSelectedBranches.includes(item.BranchCode)
            );

            //  Update Assigned Staff ONLY here
            this._updateAssignedStaffByBranch(aBranchFilteredData);

            //  Then apply full filtering
            this.onFilterChange();
        },


  _prepareDailyStatusData: function (aData) {

    const today = new Date();

    let dStart = new Date(today.getFullYear(), today.getMonth(), 1);
    let dEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    dStart.setHours(0,0,0,0);
    dEnd.setHours(23,59,59,999);

    const aStatuses = [...new Set(aData.map(i => i.Status || "Unknown"))];

    const aDailyData = [];

    for (let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {

        const day = String(d.getDate());

        const dateStr =
            d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");

        const oRow = {
            day: day,
            date: dateStr
        };

        aStatuses.forEach(status => {
            oRow[status] = 0;
        });

        aDailyData.push(oRow);
    }

    aData.forEach(item => {

        const dItemDate = new Date(item.ComplaintRaisedDate || item.InvoiceDate);

        if (!isNaN(dItemDate)) {

            dItemDate.setHours(0,0,0,0);

            const dateStr =
                dItemDate.getFullYear() + "-" +
                String(dItemDate.getMonth() + 1).padStart(2, "0") + "-" +
                String(dItemDate.getDate()).padStart(2, "0");

            const rowIndex = aDailyData.findIndex(row => row.date === dateStr);

            if (rowIndex !== -1) {

                const status = item.Status || "Unknown";

                aDailyData[rowIndex][status] =
                    (aDailyData[rowIndex][status] || 0) + 1;
            }
        }
    });

    // 🔹 Dynamic width calculation
    const chartWidth = aDailyData.length * 70; // 70px per day

    const oChartModel = this.getView().getModel("chartData");

    if (oChartModel) {
        oChartModel.setProperty("/dailyChartWidth", chartWidth + "px");
    }

    return {
        dailyValue: aDailyData,
        statuses: aStatuses
    };
}  
        ,
        _prepareMonthlyStatusData: function (aFilteredData) {

            const oMonthMap = {};
            const aStatuses = new Set();

            aFilteredData.forEach(item => {
                if (!item.ComplaintRaisedDate) return;

                const d = new Date(item.ComplaintRaisedDate);
                if (isNaN(d)) return;

                const monthKey = d.toLocaleString("en-US", { month: "short", year: "numeric" });
                const status = item.Status || "Unknown";

                aStatuses.add(status);

                if (!oMonthMap[monthKey]) {
                    oMonthMap[monthKey] = {
                        Month: monthKey
                    };
                }

                oMonthMap[monthKey][status] = (oMonthMap[monthKey][status] || 0) + 1;
            });

            // Ensure missing statuses are set to 0
            const aStatusArray = Array.from(aStatuses);
            const aFinalData = Object.values(oMonthMap).map(row => {
                aStatusArray.forEach(status => {
                    row[status] = row[status] || 0;
                });
                return row;
            });

            return {
                monthlyValue: aFinalData,
                statuses: aStatusArray
            };
        },
        _prepareYearlyStatusData: function (aFilteredData) {

            const oTotalMap = { Total: "Total" };
            const aStatuses = new Set();

            aFilteredData.forEach(item => {
                if (!item.ComplaintRaisedDate) return;

                const d = new Date(item.ComplaintRaisedDate);
                if (isNaN(d)) return;

                const status = item.Status || "Unknown";

                aStatuses.add(status);
                oTotalMap[status] = (oTotalMap[status] || 0) + 1;
            });

            const aStatusArray = Array.from(aStatuses);

            // Initialize missing statuses with 0
            aStatusArray.forEach(status => {
                if (!oTotalMap[status]) {
                    oTotalMap[status] = 0;
                }
            });

            const aFinalData = [oTotalMap];

            return {
                yearlyValue: aFinalData,
                statuses: aStatusArray
            };
        },

       _aggregateAndSetAllChartData: function (aFilteredData, aRawComplainData) {

    // Daily should NOT depend on date filter
    const oDailyStatusData = this._prepareDailyStatusData(aRawComplainData);

    const oMonthlyStatusData = this._prepareMonthlyStatusData(aFilteredData);

    const oYearlyStatusData = this._prepareYearlyStatusData(aRawComplainData || aFilteredData);

    // Aggregate Status Distribution
    const oStatusCount = aFilteredData.reduce((acc, item) => {
        const sStatus = item.Status || "Unknown";
        acc[sStatus] = (acc[sStatus] || 0) + 1;
        return acc;
    }, {});

    let aStatusDistribution = Object.entries(oStatusCount).map(
        ([status, count]) => ({
            Status: status,
            Count: count
        })
    );

    const statusOrder = ['Open', 'In Progress', 'Resolved'];

    aStatusDistribution.sort((a, b) => {
        return statusOrder.indexOf(a.Status) - statusOrder.indexOf(b.Status);
    });

    const oChartModel = this.getView().getModel("chartData").getData() || {};

    this.getView().getModel("chartData").setData({
        ...oChartModel,
        statusDistribution: aStatusDistribution,
        dailyValue: oDailyStatusData.dailyValue,
        dailyStatuses: oDailyStatusData.statuses,
        monthlyValue: oMonthlyStatusData.monthlyValue,
        monthlyStatuses: oMonthlyStatusData.statuses,
        yearlyValue: oYearlyStatusData.yearlyValue,
        yearlyStatuses: oYearlyStatusData.statuses
    });
},

        onCloseDialog: function (oEvent) {
            oEvent.getSource().getParent().getParent().close();
        },
        // --- CHART TYPE SWITCHERS ---
        IN_onPressStatusPie: function () { this.getView().getModel("ComplaintChartModel").setProperty("/statusType", "pie"); },
        // IN_onPressStatusBar: function () { this.getView().getModel("ComplaintChartModel").setProperty("/statusType", "bar"); },
        IN_onPressStatusDonut: function () { this.getView().getModel("ComplaintChartModel").setProperty("/statusType", "donut"); },
        IN_onPressDailyBar: function () { this.getView().getModel("ComplaintChartModel").setProperty("/DailyType", "bar"); },
        IN_onPressDailyLine: function () { this.getView().getModel("ComplaintChartModel").setProperty("/DailyType", "line"); },
        IN_onPressMonthlyPie: function () { this.getView().getModel("ComplaintChartModel").setProperty("/monthlyType", "waterfall"); },
        IN_onPressMonthlyBar: function () { this.getView().getModel("ComplaintChartModel").setProperty("/monthlyType", "bar"); },
        IN_onPressYearlyBar: function () { this.getView().getModel("ComplaintChartModel").setProperty("/yearlyType", "bar"); },
        IN_onPressYearlyLine: function () { this.getView().getModel("ComplaintChartModel").setProperty("/yearlyType", "line"); },

        onClearFilters: function () {
            // Get current date and calculate month range
            var oToday = new Date();
            var oFirstDay = new Date(oToday.getFullYear(), oToday.getMonth(), 1);
            var oLastDay = new Date(oToday.getFullYear(), oToday.getMonth() + 1, 0);

            // Clear all filter controls FIRST with proper reset
            this.byId("CD_statusFilter").setSelectedKey("");
            this.byId("CD_assignedStaffFilter").setSelectedKey("");
            this.byId("CD_branchFilter").setSelectedKeys([]);

            // Then set date range to current month
            this.byId("CD_complain_Date").setDateValue(oFirstDay);
            this.byId("CD_complain_Date").setSecondDateValue(oLastDay);

            // Reset filtered data
            this._aCurrentFilteredData = null;

            // Trigger filter with delay
            setTimeout(() => {
                this.onFilterChange();
            }, 100);
        },

        onPressback: function () {
            this.getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
            this.getRouter().navTo("RouteLoginPage");
        },

    });
})