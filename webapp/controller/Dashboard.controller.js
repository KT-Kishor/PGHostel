sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "../model/Formatter"
], function (BaseController, MessageBox, MessageToast, JSONModel, Formatter) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Dashboard", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteDashboard").attachMatched(this._onRouteMatched, this);
            this.getView().setModel(new JSONModel({ monthlyType: "column" }), "chartTypeModel");

        },

        _onRouteMatched: async function () {
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            await this.getBranch();
            this.loadDashboardData();
        },

        loadDashboardData: function () {
            sap.ui.core.BusyIndicator.show(0);
            var oFilter = {
                BranchID: this.BranchID
            };

            this.ajaxReadWithJQuery("HM_Booking", oFilter).then((oData) => {
                var aData = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
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

            const aTodayCards = [];
            const oMonthlyDate = {};

            aData.forEach((oBooking) => {
                if (!["New"].includes(oBooking.Status)) {
                    return;
                }

                const dStart = new Date(oBooking.StartDate);
                const dEnd = new Date(oBooking.EndDate);

                dStart.setHours(0, 0, 0, 0);
                dEnd.setHours(0, 0, 0, 0);

                if (oToday >= dStart && oToday <= dEnd) {
                    aTodayCards.push({
                        BookingID: oBooking.BookingID,
                        CustomerID: oBooking.CustomerID,
                        RoomNo: oBooking.RoomNo,
                        StartDate: oBooking.StartDate,
                        EndDate: oBooking.EndDate
                    });
                }

                const dBooking = new Date(oBooking.BookingDate);
                const sMonthKey =
                    dBooking.getFullYear() + "-" + (dBooking.getMonth() + 1);

                oMonthlyDate[sMonthKey] = (oMonthlyDate[sMonthKey] || 0) + 1;
            });

            this.dashboardModels(aTodayCards, oMonthlyDate);
        },

        _groupCardsForCarousel: function (aCards, iPerPage) {
            const aPages = [];
            for (let i = 0; i < aCards.length; i += iPerPage) {
                aPages.push(aCards.slice(i, i + iPerPage));
            }
            return aPages;
        },


        dashboardModels: function (aCards, oMonthMap) {
            const aPages = this._groupCardsForCarousel(aCards, 5);
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
            const oComponent = this.getOwnerComponent();
            let oBRModel = oComponent.getModel("sBRModel");

            if (!oBRModel) {
                await oComponent._fetchCommonData("HM_Branch", "sBRModel");
                oBRModel = oComponent.getModel("sBRModel");
            }

            const aData = oBRModel?.getData();
            return Array.isArray(aData) ? aData : [];
        },

        onBookingCardPress: function (oEvent) {
            this.getOwnerComponent().getRouter().navTo("RouteAdminDetails", {
                sPath: encodeURIComponent(oEvent.getSource().getBindingContext("todayModel").getObject().CustomerID)
            });
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        _bindMonthlyChart: function () {
            const oVizFrame = this.byId("bookingChart");
            if (!oVizFrame) {
                return;
            }
            const sChartType = this.getView().getModel("chartTypeModel").getProperty("/monthlyType");
            const oDataset = new sap.viz.ui5.data.FlattenedDataset({
                dimensions: [{
                    name: "Month",
                    value: "{Month}"
                }],
                measures: [{
                    name: "Bookings",
                    value: "{Count}"
                }],
                data: {
                    path: "/data"
                }
            });

            oVizFrame.setModel(this.getView().getModel("chartModel"));
            oVizFrame.setDataset(oDataset);
            oVizFrame.removeAllFeeds();
            if (sChartType === "pie") {
                oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid: "size",
                    type: "Measure",
                    values: ["Bookings"]
                }));
                oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid: "color",
                    type: "Dimension",
                    values: ["Month"]
                }));
            } else {
                oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid: "valueAxis",
                    type: "Measure",
                    values: ["Bookings"]
                }));
                oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid: "categoryAxis",
                    type: "Dimension",
                    values: ["Month"]
                }));
            }
        },

        onColumnChart: function () {
            this.getView().getModel("chartTypeModel")
                .setProperty("/monthlyType", "column");
        },

        onBarChart: function () {
            this.getView().getModel("chartTypeModel")
                .setProperty("/monthlyType", "bar");
        },

        onLineChart: function () {
            this.getView().getModel("chartTypeModel")
                .setProperty("/monthlyType", "line");
        },

        onPieChart: function () {
            this.getView().getModel("chartTypeModel")
                .setProperty("/monthlyType", "pie");
        },

    })
})