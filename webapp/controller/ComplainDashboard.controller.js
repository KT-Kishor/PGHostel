sap.ui.define([
     "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "../model/formatter"
],function(BaseController, JSONModel, MessageToast, Fragment, formatter) {
    "use strict";
     const INITIAL_CHART_TYPES = {
        statusType: "donut",
        DailyType: "line",
        monthlyType: "bar",
        yearlyType: "bar"
      
    };
    return BaseController.extend("sap.ui.com.project1.controller.ComplainDashboard", {
          Formatter: formatter,

        _oGroupedInvoices: {},
        _aCurrentFilteredData: [],
        onInit: function() {
              const oChartData = {
                statusDistribution: [],
                monthlyValue: [],
                yearlyTrend: [],
                paymentBreakdown: [],
            };
            this.getView().setModel(new JSONModel(oChartData), "chartData");
            // this.getView().setModel(new JSONModel([]), "customers");
            // this.getView().setModel(new JSONModel({ filterSuffix: "" }), "headerModel");
            // Initialize the chart type model with the default values.
            this.getView().setModel(new JSONModel(INITIAL_CHART_TYPES), "ComplaintChartModel");
            this.getOwnerComponent().getRouter().getRoute("RouteComplainDashboard").attachMatched(this._onRouteMatched, this);
        },
        onNavBack: function() {
            if(this.sPath==="Complaindetails"){
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteComplaintDetails");
            }else{
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
            }
        },
       
        _onRouteMatched: async function(oEvent) {
            this.sPath = oEvent.getParameter("arguments").sPath;

            var LoginFunction = await this.commonLoginFunction("ComplainDashboard");
             if (!LoginFunction) return;
             this._ViewDatePickersReadOnly(["CD_branchFilter", "CD_complain_Date", "CD_assignedStaffFilter","CD_statusFilter"], this.getView());
            this.Loginmodel = this.getOwnerComponent().getModel("LoginModel").getData()
               const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
            if (oLoginModel) {
                this._oLoggedInUser = oLoginModel.getData();
            } else {
                this._oLoggedInUser = {};
            }
           await this._loadBranchCode();
           this._buildBranchMap();
           this._setCurrentMonthDateRange();
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
                } else if (oExistingModel.Role === "SuperAdmin" ) {
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
                sap.ui.core.BusyIndicator.show(0);

                // Prepare filters based on role
                let ComplaintFilters = {};

                // If user is not Super Admin, filter by allowed branches
                if (this._oLoggedInUser?.Role !== "Super Admin" && this._allowedBranches) {
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
                sap.ui.core.BusyIndicator.hide();
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
    const currentYear = new Date().getFullYear();
    if (!this.rawComplainData) return;

    sap.ui.core.BusyIndicator.show(0);

    setTimeout(() => {
        try {
            const aRawData = [...this.rawComplainData];

            // Branch
            const aSelectedBranches = this.byId("CD_branchFilter").getSelectedKeys();

            // 🔹 STEP 1: Filter ONLY by branch (for AssignedBy list)
            const aBranchFilteredData = aRawData.filter(item => {
                return (
                    aSelectedBranches.length === 0 ||
                    aSelectedBranches.includes(item.BranchCode)
                );
            });

            //  STEP 2: Update Assigned Staff dropdown
            // Status
            const sSelectedStatus = this.byId("CD_statusFilter").getSelectedKey();

            // Assigned Staff
            const sAssignedBy = this.byId("CD_assignedStaffFilter").getSelectedKey();

            // Date Range
            const oDateRange = this.byId("CD_complain_Date");
            const dFrom = oDateRange.getDateValue();
            const dTo = oDateRange.getSecondDateValue();

            // 🔹 STEP 3: Apply ALL filters
            const aFilteredData = aBranchFilteredData.filter(item => {

                if (sSelectedStatus && item.Status !== sSelectedStatus) {
                    return false;
                }

                if (sAssignedBy && item.AssignedBy !== sAssignedBy) {
                    return false;
                }

                const dItemDate = new Date(item.ComplaintRaisedDate || item.InvoiceDate);
                if (isNaN(dItemDate)) return false;

                dItemDate.setHours(0, 0, 0, 0);

                if (dFrom && dTo) {
                    dFrom.setHours(0, 0, 0, 0);
                    dTo.setHours(23, 59, 59, 999);

                    if (dItemDate < dFrom || dItemDate > dTo) {
                        return false;
                    }
                } else if (dItemDate.getFullYear() !== currentYear) {
                    return false;
                }

                return true;
            });

            // Map Branch Names
            aFilteredData.forEach(item => {
                item.BranchName =
                    (this._branchMap && this._branchMap[item.BranchCode]) ||
                    item.BranchCode ||
                    "Unknown";
            });

            this._aCurrentFilteredData = aFilteredData;
            this._aggregateAndSetAllChartData(aFilteredData);

        } catch (e) {
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
        } finally {
            sap.ui.core.BusyIndicator.hide();
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


        _prepareDailyStatusData: function (aFilteredData) {
    const oDateRange = this.byId("CD_complain_Date");
    let year, month;

    // Priority: DateRange → Year Filter → Current Month
    if (oDateRange.getDateValue()) {
        const d = oDateRange.getDateValue();
        year = d.getFullYear();
        month = d.getMonth();
    } else {
        const today = new Date();
        year = today.getFullYear();
        month = today.getMonth();
    }

    // Number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Collect all statuses dynamically
    const aStatuses = [...new Set(aFilteredData.map(i => i.Status || "Unknown"))];

    // Initialize all days
    const aDailyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const oRow = {
            day: String(day).padStart(2, "0")
        };

        aStatuses.forEach(status => oRow[status] = 0);
        aDailyData.push(oRow);
    }

    // Aggregate
    aFilteredData.forEach(item => {
        if (!item.ComplaintRaisedDate) return;

        const d = new Date(item.ComplaintRaisedDate);
        if (d.getMonth() !== month || d.getFullYear() !== year) return;

        const dayIndex = d.getDate() - 1;
        const status = item.Status || "Unknown";

        aDailyData[dayIndex][status]++;
    });

    return {
        dailyValue: aDailyData,
        statuses: aStatuses
    };
},
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

    const oYearMap = {};
    const aStatuses = new Set();

    aFilteredData.forEach(item => {
        if (!item.ComplaintRaisedDate) return;

        const d = new Date(item.ComplaintRaisedDate);
        if (isNaN(d)) return;

        const year = d.getFullYear();
        const status = item.Status || "Unknown";

        aStatuses.add(status);

        if (!oYearMap[year]) {
            oYearMap[year] = { Year: year };
        }

        oYearMap[year][status] = (oYearMap[year][status] || 0) + 1;
    });

    const aStatusArray = Array.from(aStatuses);

    const aFinalData = Object.values(oYearMap).map(row => {
        aStatusArray.forEach(status => {
            row[status] = row[status] || 0;
        });
        return row;
    });

    return {
        yearlyValue: aFinalData,
        statuses: aStatusArray
    };
},

        _aggregateAndSetAllChartData: function (aFilteredData) {
    
           
            //  Daily Status-wise Complaint Trend
            const oDailyStatusData = this._prepareDailyStatusData(aFilteredData);
            const oMonthlyStatusData = this._prepareMonthlyStatusData(aFilteredData);
            const oYearlyStatusData = this._prepareYearlyStatusData(aFilteredData);
        
          
             const oStatusCount = aFilteredData.reduce((acc, item) => {
    const sStatus = item.Status || "Unknown";
    acc[sStatus] = (acc[sStatus] || 0) + 1;
    return acc;
}, {});
const aStatusDistribution = Object.entries(oStatusCount).map(
    ([status, count]) => ({
        Status: status,
        Count: count
    })
);

            const oChartModel = this.getView().getModel("chartData").getData() || {};
            //---------------------------------------------------------------------
            // 1 SET FINAL MODEL DATA
            //---------------------------------------------------------------------
            this.getView().getModel("chartData").setData({
                ...oChartModel, // preserve any existing properties
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
        IN_onPressStatusBar: function () { this.getView().getModel("ComplaintChartModel").setProperty("/statusType", "bar"); },
        IN_onPressStatusDonut: function () { this.getView().getModel("ComplaintChartModel").setProperty("/statusType", "donut"); },
        IN_onPressDailyPie: function () { this.getView().getModel("ComplaintChartModel").setProperty("/DailyType", "waterfall"); },
        IN_onPressDailyBar: function () { this.getView().getModel("ComplaintChartModel").setProperty("/DailyType", "bar"); },
        IN_onPressDailyLine: function () { this.getView().getModel("ComplaintChartModel").setProperty("/DailyType", "line"); },
        IN_onPressMonthlyPie: function () { this.getView().getModel("ComplaintChartModel").setProperty("/monthlyType", "waterfall"); },
        IN_onPressMonthlyBar: function () { this.getView().getModel("ComplaintChartModel").setProperty("/monthlyType", "bar"); },
        IN_onPressYearlyBar: function () { this.getView().getModel("ComplaintChartModel").setProperty("/yearlyType", "bar"); },
        IN_onPressYearlyLine: function () { this.getView().getModel("ComplaintChartModel").setProperty("/yearlyType", "line"); },

        onClearFilters: function () {

            this.byId("CD_complain_Date").setValue("");
            this.byId("CD_statusFilter").setValue("");
            this.byId("CD_branchFilter").setSelectedKeys([]); 
        },

        onPressback: function () {
            this.getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
            this.getRouter().navTo("RouteLoginPage");
        },

    });
})