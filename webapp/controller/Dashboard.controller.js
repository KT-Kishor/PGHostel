sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    "sap/viz/ui5/data/FlattenedDataset"
], function (BaseController, MessageToast, JSONModel, Formatter, FeedItem, FlattenedDataset) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Dashboard", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteDashboard").attachMatched(this._onRouteMatched, this);
            this.getView().setModel(new JSONModel({ monthly: "column", daily: "column", status: "column", payment: "column" }), "chartTypeModel");
        },

        _onRouteMatched: async function () {
            this.commonLoginFunction();
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            const oNow = new Date();
            const iMonth = oNow.getMonth() + 1;
            const iYear = oNow.getFullYear();
            this.byId("D_id_month").setSelectedKey(String(iMonth));
            this.byId("D_id_year").setValue(String(iYear));
            const oLogin = this.getOwnerComponent().getModel("LoginModel")?.getData();
            if (!oLogin || !oLogin.BranchCode) return sap.m.MessageToast.show("Login branch not found");
            this.BranchID = oLogin.BranchCode;
            await this._loadCustomers();
            this.loadDashboardData();
            this.onFilterGo();
        },

        loadDashboardData: function () {
            sap.ui.core.BusyIndicator.show(0);
            var oFilter = { BranchID: this.BranchID };
            this.ajaxReadWithJQuery("HM_Booking", oFilter).then((oData) => {
                var aData = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
                this._aAllBookings = aData;
                this.dashboardSetDate(aData);
                sap.ui.core.BusyIndicator.hide();
            })
                .catch(() => {
                    MessageToast.show(this.i18nModel.getText("Failed to load dashboard data"));
                    sap.ui.core.BusyIndicator.hide();
                });
        },

        dashboardSetDate: function (aData) {
            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0);
            const aAllowedBranches = this.BranchID
            const aTodayCards = [];
            const oMonthlyDate = {};
            aData.forEach((oBooking) => {
                if (!["New"].includes(oBooking.Status)) return;
                if (!aAllowedBranches.includes(oBooking.BranchCode)) return;

                const dBookingDate = new Date(oBooking.BookingDate);
                dBookingDate.setHours(0, 0, 0, 0);
                if (dBookingDate.getTime() === oToday.getTime()) {
                    aTodayCards.push({
                        BookingID: oBooking.BookingID,
                        BookingDate: oBooking.BookingDate,
                        CustomerName: this._mCustomerMap[oBooking.CustomerID],
                        CustomerID: oBooking.CustomerID,
                        RoomNo: oBooking.RoomNo,
                        StartDate: oBooking.StartDate,
                        EndDate: oBooking.EndDate
                    });
                }
                const dBooking = new Date(oBooking.BookingDate);
                const sMonthKey = dBooking.getFullYear() + "-" + (dBooking.getMonth() + 1);
                oMonthlyDate[sMonthKey] = (oMonthlyDate[sMonthKey] || 0) + 1;
            });
            this.dashboardModels(aTodayCards, oMonthlyDate);
        },

        _groupCardsForCarousel: function (aCards, iPerPage) {
            const aPages = [];
            for (let i = 0; i < aCards.length; i += iPerPage) {
                aPages.push(aCards.slice(i, iPerPage + i));
            }
            return aPages;
        },

        _getCardsPerPage: function () {
            const w = window.innerWidth;
            if (w < 600) return 1;
            if (w < 900) return 2;
            if (w < 1200) return 3;
            if (w < 1600) return 4;
            return 5;
        },

        dashboardModels: function (aCards, oMonthMap) {
            this._aTodayCards = aCards;
            const iPerPage = this._getCardsPerPage();
            const aPages = this._groupCardsForCarousel(this._aTodayCards, iPerPage);
            this.getView().setModel(new JSONModel({ pages: aPages }), "todayModel");

            const aMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const oChartData = Object.keys(oMonthMap).map((sKey) => {
                const [year, month] = sKey.split("-");
                return {
                    Month: aMonthNames[parseInt(month, 10) - 1],
                    Count: oMonthMap[sKey]
                };
            });
            this.getView().setModel(new JSONModel({ data: oChartData }), "chartModel");
            this._bindMonthlyChart();
        },

        getBranch: async function () {
            const oComponent = this.getOwnerComponent().getModel("sBRModel");
            if (!oComponent) {
                await oComponent._fetchCommonData("HM_Branch", "sBRModel");
            }
            const aData = oComponent?.getData();
            return Array.isArray(aData) ? aData : [];
        },

        onBookingCardPress: function (oEvent) {
            var sCustomerID = oEvent.getSource().getBindingContext("todayModel").getObject().CustomerID;
            var sEncodedID = btoa(sCustomerID.toString());
            this.getOwnerComponent().getRouter().navTo("RouteAdminDetails", {
                sPath: encodeURIComponent(sEncodedID),
                from: "Dashboard"
            });
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        _bindMonthlyChart: function () {
            const oVizFrame = this.byId("bookingChart");
            if (!oVizFrame) return;

            const sChartType = this.getView().getModel("chartTypeModel").getProperty("/monthlyType");
            const oDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Month",
                    value: "{month}"
                }],
                measures: [{
                    name: "Count",
                    value: "{count}"
                }],
                data: {
                    path: "/data"
                }
            });
            oVizFrame.setModel(this.getView().getModel("monthlyChartModel"));
            oVizFrame.setDataset(oDataset);
            oVizFrame.removeAllFeeds();

            if (sChartType === "pie") {
                oVizFrame.addFeed(new FeedItem({
                    uid: "size",
                    type: "Measure",
                    values: ["Count"]
                }));
                oVizFrame.addFeed(new FeedItem({
                    uid: "color",
                    type: "Dimension",
                    values: ["Month"]
                }));
            } else {
                oVizFrame.addFeed(new FeedItem({
                    uid: "valueAxis",
                    type: "Measure",
                    values: ["Count"]
                }));
                oVizFrame.addFeed(new FeedItem({
                    uid: "categoryAxis",
                    type: "Dimension",
                    values: ["Month"]
                }));
            }
        },

        _loadMonthChart: function (oPayload) {
            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_GetCurrentYearBarChart", oPayload).then((oData) => {
                console.log("month wise response:", oData);
                let aData = Array.isArray(oData) ? oData : oData.data;
                if (aData.length === 0) aData = this.switchForAllGraph("MONTH");

                this.getView().setModel(new JSONModel({ data: aData }), "monthlyChartModel");
                this._bindMonthlyChart();
                sap.ui.core.BusyIndicator.hide();
            })
                .catch(() => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Failed to load monthly chart");
                });
        }, 

        _loadDayChart: function (oPayload) {
            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_GetCurrentMonthBarChart", oPayload).then((oData) => {
                console.log("daily wise response:", oData);
                let aData = oData.results || [];
                if (aData.length === 0) aData = this.switchForAllGraph("DAY");

                this.getView().setModel(new JSONModel({ data: aData }), "dailyChartModel");
                this._bindDailyChart();
                sap.ui.core.BusyIndicator.hide();
            })
                .catch(() => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Failed to load daily chart");
                });
        },

        _bindDailyChart: function () {
            const oVizFrame = this.byId("dailyBookingChart");
            if (!oVizFrame) return;

            const oDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Day",
                    value: "{Date}"
                }],
                measures: [{
                    name: "Count",
                    value: "{Count}"
                }],
                data: {
                    path: "/data"
                }
            });
            oVizFrame.setModel(this.getView().getModel("dailyChartModel"));
            oVizFrame.setDataset(oDataset);
            oVizFrame.removeAllFeeds();

            oVizFrame.addFeed(new FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: ["Count"]
            }));

            oVizFrame.addFeed(new FeedItem({
                uid: "categoryAxis",
                type: "Dimension",
                values: ["Day"]
            }));
        },

        _loadStatusChart: function (oPayload) {
            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_GetCurrentYearStatusBarChart", oPayload).then((oData) => {
                console.log("status wise response:", oData);
                const aData = Array.isArray(oData) ? oData : (oData.results || oData.data || []);
                if (aData.length === 0) {
                    aData = this.switchForAllGraph("STATUS");
                }
                this.getView().setModel(new JSONModel({ data: aData }), "statusChartModel");
                this._bindStatusChart();
                sap.ui.core.BusyIndicator.hide();
            })
                .catch(() => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Failed to load status chart");
                });
        },

        _bindStatusChart: function () {
            const oVizFrame = this.byId("statusBookingChart");
            if (!oVizFrame) return;
            const sChartType =
                this.getView().getModel("chartTypeModel").getProperty("/monthlyType");
            const oDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Status",
                    value: "{Status}"
                }],
                measures: [{
                    name: "Count",
                    value: "{Count}"
                }],
                data: {
                    path: "/data"
                }
            });

            oVizFrame.setModel(this.getView().getModel("statusChartModel"));
            oVizFrame.setDataset(oDataset);
            oVizFrame.removeAllFeeds();

            oVizFrame.addFeed(new FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: ["Count"]
            }));

            oVizFrame.addFeed(new FeedItem({
                uid: "categoryAxis",
                type: "Dimension",
                values: ["Status"]
            }));
        },

        _loadPaymentTypeChart: function (oPayload) {
            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_GetCurrentYearPaymentTypeBarChart", oPayload).then((oData) => {
                console.log("payment wise response:", oData);
                const aData = Array.isArray(oData) ? oData : oData.results || [];
                // if (aData.length === 0) {
                //     aData = this.switchForAllGraph("PAYMENT");
                // }
                this.getView().setModel(new JSONModel({ data: aData }), "paymentTypeChartModel");
                this._bindPaymentTypeChart();
                sap.ui.core.BusyIndicator.hide();
            })
                .catch(() => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Failed to load payment type chart");
                });
        },

        _bindPaymentTypeChart: function () {
            const oVizFrame = this.byId("paymentTypeChart");
            if (!oVizFrame) return;
            const oDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Payment Type",
                    value: "{Status}"
                }],
                measures: [{
                    name: "Count",
                    value: "{Count}"
                }],
                data: {
                    path: "/data"
                }
            });
            oVizFrame.setModel(this.getView().getModel("paymentTypeChartModel"));
            oVizFrame.setDataset(oDataset);
            oVizFrame.removeAllFeeds();

            oVizFrame.addFeed(new FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: ["Count"]
            }));

            oVizFrame.addFeed(new FeedItem({
                uid: "categoryAxis",
                type: "Dimension",
                values: ["Payment Type"]
            }));
        },

        onColumnChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/monthly", "column");
        },

        onBarChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/monthly", "bar");
        },

        onLineChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/monthly", "line");
        },

        onPieChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/monthly", "pie");
        },

        ondayColumnChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/daily", "column");
        },

        ondayBarChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/daily", "bar");
        },

        ondayLineChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/daily", "line");
        },

        ondayPieChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/daily", "pie");
        },

        onStatusColumnChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/status", "column");
        },

        onStatusBarChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/status", "bar");
        },

        onStatusLineChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/status", "line");
        },

        onStatusPieChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/status", "pie");
        },

        onPayColumnChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/payment", "column");
        },

        onPayBarChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/payment", "bar");
        },

        onPayLineChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/payment", "line");
        },

        onPayPieChart: function () {
            this.getView().getModel("chartTypeModel").setProperty("/payment", "pie");
        },

        _loadCustomers: function () {
            return this.ajaxReadWithJQuery("HM_Customer", {}).then((oData) => {
                const aCustomers = Array.isArray(oData.Customers) ? oData.Customers : [];
                const mCustomerMap = {};
                aCustomers.forEach(c => { mCustomerMap[c.CustomerID] = c.CustomerName || c.Name });
                this._mCustomerMap = mCustomerMap;
            })
                .catch(() => {
                    this._mCustomerMap = {};
                });
        },

        _getStartEndDate: function () {
            const sYear = this.byId("D_id_year").getValue();
            const sMonth = this.byId("D_id_month").getSelectedKey();

            if (!sYear || !sMonth) {
                return {};
            }
            const iYear = parseInt(sYear, 10);
            const iMonth = parseInt(sMonth, 10); // 1–12

            const monthStart = new Date(iYear, iMonth - 1, 1);
            const monthEnd = new Date(iYear, iMonth, 0);

            const yearStart = new Date(iYear, 0, 1);
            const yearEnd = new Date(iYear, 11, 31);

            const format = (d) =>
                d.getFullYear() + "-" +
                String(d.getMonth() + 1).padStart(2, "0") + "-" +
                String(d.getDate()).padStart(2, "0");

            return {
                monthStart: format(monthStart),
                monthEnd: format(monthEnd),
                yearStart: format(yearStart),
                yearEnd: format(yearEnd)
            };
        },

        onFilterGo: function () {
            if (!this.BranchID) return MessageToast.show("Branch not ready");
            const oRange = this._getStartEndDate();
             const bMonthSelected = this.byId("D_id_month").getSelectedKey();
            const oMonthPayload = {
                StartDate: oRange.yearStart,
                EndDate: oRange.yearEnd,
                BranchCode: this.BranchID
            };
            const oDailyPayload = {
                StartDate: oRange.monthStart,
                EndDate: oRange.monthEnd,
                BranchCode: this.BranchID
            };
            const oStatusPayload = {
                StartDate: oRange.yearStart,
                EndDate: oRange.yearEnd,
                BranchCode: this.BranchID
            };
            const oPaymentPayload = {
        StartDate: bMonthSelected ? oRange.monthStart : oRange.yearStart,
        EndDate: bMonthSelected ? oRange.monthEnd : oRange.yearEnd,
        BranchCode: this.BranchID
    };
            console.log("Month Chart Filters:", oMonthPayload);
            console.log("Daily Chart Filters:", oDailyPayload);
            console.log("Status Chart Filters:", oStatusPayload);
            console.log("Payment Chart Filters:", oPaymentPayload);
            this._loadMonthChart(oMonthPayload);
            this._loadDayChart(oDailyPayload);
            this._loadStatusChart(oStatusPayload);
            this._loadPaymentTypeChart(oPaymentPayload);
        },

        switchForAllGraph: function (sType) {
            switch (sType) {
                case "MONTH":
                    return [
                        { Month: "Jan", Count: 0 },
                        { Month: "Feb", Count: 0 },
                        { Month: "Mar", Count: 0 },
                        { Month: "Apr", Count: 0 },
                        { Month: "May", Count: 0 },
                        { Month: "Jun", Count: 0 },
                        { Month: "Jul", Count: 0 },
                        { Month: "Aug", Count: 0 },
                        { Month: "Sep", Count: 0 },
                        { Month: "Oct", Count: 0 },
                        { Month: "Nov", Count: 0 },
                        { Month: "Dec", Count: 0 }];
                case "DAY":
                    return Array.from({ length: 31 }, (_, i) => ({ Day: i + 1, Count: 0 }));
                case "STATUS":
                    return [
                        { Status: "New", Count: 0 },
                        { Status: "Assigned", Count: 0 },
                        { Status: "Completed", Count: 0 },
                        { Status: "Cancelled", Count: 0 }
                    ];
                case "PAYMENT":
                    return [
                        { Status: "Per Day", Count: 0 },
                        { Status: "Per Month", Count: 0 },
                        { Status: "Per Year", Count: 0 }
                    ];
                default:
                    return [];
            }
        },

        onHome: function () {
            this.CommonLogoutFunction();
            this.getView().getModel("mainModel").setData({});
        },

        D_onPressClear: function () {
            this.byId("D_id_year").setValue("");
            this.byId("D_id_month").setSelectedKey("");
        }
    })
})