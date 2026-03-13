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
            this.getBusyDialog();;
            try {
                this.commonLoginFunction();
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._ViewDatePickersReadOnly(["D_id_year"], this.getView());
                const oNow = new Date();
                const iMonth = oNow.getMonth() + 1;
                const iYear = oNow.getFullYear();
                this.byId("D_id_month").setSelectedKey(String(iMonth));
                this.byId("D_id_year").setValue(String(iYear));
                const oLogin = this.getOwnerComponent().getModel("LoginModel")?.getData();
                if (!oLogin || !oLogin.BranchCode) return sap.m.MessageToast.show("Login branch not found");
                this._aUserBranches = oLogin.BranchCode ? oLogin.BranchCode.split(",").map(b => b.trim()) : [];
                await this._loadCustomers();
                await this._loadUserBranches();
                await this.loadDashboardData();
                await this.D_search();
            } catch (err) {
                MessageToast.show("Something went wrong");
            } finally {
                this.closeBusyDialog();
            }
        },

        loadDashboardData: async function () {
            // sap.ui.core.BusyIndicator.show(0);
            // this.getBusyDialog();
            try {
                if (!this._aUserBranches || this._aUserBranches.length === 0) {
                    return;
                }
                var oFilter = {
                    BranchID: this._aUserBranches.join(",")
                };

                const oData = await this.ajaxReadWithJQuery("HM_Booking", oFilter);
                var aData = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
                this._aAllBookings = aData;
                this.dashboardSetDate(aData, this._aUserBranches);
                // sap.ui.core.BusyIndicator.hide();
                this.closeBusyDialog();
            } catch (err) {
                MessageToast.show(this.i18nModel.getText("Failed to load dashboard data"));
                // sap.ui.core.BusyIndicator.hide();
                // this.closeBusyDialog();
            }
        },

        dashboardSetDate: function (aData, aBranchesToUse) {
            const aAllowedBranches = aBranchesToUse;
            const aCards = [];
            const today = new Date();
            const todayFormatted =
                today.getFullYear() + "-" +
                String(today.getMonth() + 1).padStart(2, "0") + "-" +
                String(today.getDate()).padStart(2, "0");
            aData.forEach((oBooking) => {
                if (!["New", "Assigned", "Completed", "Cancelled"].includes(oBooking.Status)) return;
                if (!aAllowedBranches.includes(oBooking.BranchCode)) return;
                const d = new Date(oBooking.BookingDate);
                const bookingDate =
                    d.getFullYear() + "-" +
                    String(d.getMonth() + 1).padStart(2, "0") + "-" +
                    String(d.getDate()).padStart(2, "0");

                if (bookingDate !== todayFormatted) return;
                aCards.push({
                    BookingID: oBooking.BookingID,
                    BookingDate: this.Formatter.formatDate(oBooking.BookingDate),
                    CustomerName: this._mCustomerMap[oBooking.CustomerID],
                    CustomerID: oBooking.CustomerID,
                    RoomNo: oBooking.RoomNo,
                    Status: oBooking.Status,
                    StartDate: this.Formatter.formatDate(oBooking.StartDate),
                    EndDate: this.Formatter.formatDate(oBooking.EndDate)
                });
            });
            this.dashboardModels(aCards);
        },

        // _groupCardsForCarousel: function (aCards, iPerPage) {
        //     const aPages = [];
        //     for (let i = 0; i < aCards.length; i += iPerPage) {
        //         aPages.push(aCards.slice(i, iPerPage + i));
        //     }
        //     return aPages;
        // },

        // _getCardsPerPage: function () {
        //     const container = this.byId("todayCarousel").getDomRef()?.clientWidth;
        //     const cardMinWidth = 300;
        //     const gap = 16;

        //     if (!container) return 1;

        //     return Math.floor(container / (cardMinWidth + gap)) || 1;
        // },

        dashboardModels: function (aCards) {
            this._aTodayCards = aCards;
            // const iPerPage = this._getCardsPerPage();
            // const aPages = this._groupCardsForCarousel(this._aTodayCards, iPerPage);
            this._renderIntegrationCards(aCards);
            // const aMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            // const oChartData = Object.keys(oMonthMap).map((sKey) => {
            //     const [year, month] = sKey.split("-");
            //     return {
            //         Month: aMonthNames[parseInt(month, 10) - 1],
            //         Count: oMonthMap[sKey]
            //     };
            // });
            // this.getView().setModel(new JSONModel({ data: oChartData }), "chartModel");
            this._bindMonthlyChart();
        },

        // _renderIntegrationCards: function (aPages) {
        //     const oCarousel = this.byId("todayCarousel");
        //     oCarousel.removeAllItems();
        //     aPages.forEach((aPageCards) => {
        //         const oVBox = new sap.m.VBox();
        //         const oFlex = new sap.m.FlexBox({
        //             direction: "Row",
        //             wrap: "Wrap",
        //             justifyContent: "Start",
        //         });
        //         oFlex.addStyleClass("todayCardsRow");
        //         aPageCards.forEach((oBooking) => {
        //             // inject booking as default model
        //             const oCard = new sap.ui.integration.widgets.Card({
        //                 manifest: "cards/BookingDashboard.json",
        //                 // parameters: {
        //                 //     BookingID: oBooking.BookingID,
        //                 //     BookingDate: oBooking.BookingDate,
        //                 //     CustomerName: oBooking.CustomerName,
        //                 //     CustomerID: oBooking.CustomerID,
        //                 //     StartDate: oBooking.StartDate,
        //                 //     EndDate: oBooking.EndDate
        //                 // }
        //             });
        //             oCard.setModel(new sap.ui.model.json.JSONModel(oBooking), "data");
        //             oCard.addStyleClass("dynamicCard");
        //             oCard.attachAction(this.onCardAction.bind(this));
        //             oFlex.addItem(oCard);
        //         });

        //         oVBox.addItem(oFlex);
        //         oCarousel.addItem(oVBox);
        //     });
        // },

        // onAfterRendering: function () {
        //     window.addEventListener("resize", this._handleResize.bind(this));
        // },

        // _handleResize: function () {
        //     if (!this._aTodayCards) return;

        //     const iPerPage = this._getCardsPerPage();
        //     const aPages = this._groupCardsForCarousel(this._aTodayCards, iPerPage);
        //     this._renderIntegrationCards(aPages);
        // },

        _renderIntegrationCards: function (aCards) {
            const oContainer = this.byId("todayCarousel");
            oContainer.removeAllItems();

            if (!aCards || aCards.length === 0) {
                return;
            }
            aCards.forEach((oBooking) => {
                const oCard = new sap.ui.integration.widgets.Card({
                    manifest: "cards/BookingDashboard.json",
                    width: "320px"
                });

                oCard.setModel(new JSONModel(oBooking), "data");
                oCard.addStyleClass("dynamicCard");
                oCard.attachAction(this.onCardAction.bind(this));
                oContainer.addItem(oCard);
            });
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

        _loadMonthChart: async function (oPayload) {
            try {
                // sap.ui.core.BusyIndicator.show(0);
                // this.getBusyDialog();
                const oData = await this.ajaxReadWithJQuery("HM_GetCurrentYearBarChart", oPayload)
                console.log("month wise response:", oData);
                let aData = Array.isArray(oData) ? oData : oData.data;
                if (aData.length === 0) {
                    aData = this.switchForAllGraph("MONTH");
                }
                this.getView().setModel(new JSONModel({ data: aData }), "monthlyChartModel");
                this._bindMonthlyChart();
                // sap.ui.core.BusyIndicator.hide();
                // this.closeBusyDialog()

            } catch (err) {
                // sap.ui.core.BusyIndicator.hide();
                // this.closeBusyDialog()
                MessageToast.show("Failed to load monthly chart");
            }
        },

        _loadDayChart: async function (oPayload) {
            try {
                // sap.ui.core.BusyIndicator.show(0);
                // this.getBusyDialog();
                const oData = await this.ajaxReadWithJQuery("HM_GetCurrentMonthBarChart", oPayload)
                console.log("daily wise response:", oData);
                let aData = oData.results || [];
                if (aData.length === 0) {
                    aData = this.switchForAllGraph("DAY");
                }
                this.getView().setModel(new JSONModel({ data: aData }), "dailyChartModel");
                this._bindDailyChart();
                // sap.ui.core.BusyIndicator.hide();
                // this.closeBusyDialog();
            } catch (err) {
                // sap.ui.core.BusyIndicator.hide();
                // this.closeBusyDialog();
                MessageToast.show("Failed to load daily chart");
            };
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

        _loadStatusChart: async function (oPayload) {
            try {
                // sap.ui.core.BusyIndicator.show(0);
                // this.getBusyDialog();
                const oData = await this.ajaxReadWithJQuery("HM_GetCurrentYearStatusBarChart", oPayload);
                console.log("status wise response:", oData);
                const aData = Array.isArray(oData) ? oData : (oData.results || oData.data || []);
                if (aData.length === 0) {
                    aData = this.switchForAllGraph("STATUS");
                }
                this.getView().setModel(new JSONModel({ data: aData }), "statusChartModel");
                this._bindStatusChart();
                // sap.ui.core.BusyIndicator.hide();
                // this.closeBusyDialog()
            } catch (err) {
                // sap.ui.core.BusyIndicator.hide();
                // this.closeBusyDialog()
                MessageToast.show("Failed to load status chart");
            }
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

        _loadPaymentTypeChart: async function (oPayload) {
            try {
                // sap.ui.core.BusyIndicator.show(0);
                // this.getBusyDialog();
                const oData = await this.ajaxReadWithJQuery("HM_GetCurrentYearPaymentTypeBarChart", oPayload)
                console.log("payment wise response:", oData);
                const aData = Array.isArray(oData) ? oData : oData.results || [];
                // if (aData.length === 0) {
                //     aData = this.switchForAllGraph("PAYMENT");
                // }
                this.getView().setModel(new JSONModel({ data: aData }), "paymentTypeChartModel");
                this._bindPaymentTypeChart();
                // sap.ui.core.BusyIndicator.hide();
                // this.closeBusyDialog()
            } catch (err) {
                // sap.ui.core.BusyIndicator.hide();
                // this.closeBusyDialog()
                MessageToast.show("Failed to load payment type chart");
            };
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

        D_search: async function () {
           this.getBusyDialog();
            try {

                const aSelectedBranches = this.byId("D_id_BranchCode").getSelectedKeys();
                let aBranchesToUse = [];

                // If nothing selected → use all authorized branches
                if (!aSelectedBranches || aSelectedBranches.length === 0) {
                    aBranchesToUse = this._aUserBranches || [];
                } else {
                    aBranchesToUse = aSelectedBranches.filter(b =>
                        this._aUserBranches.includes(b)
                    );
                    if (aBranchesToUse.length === 0) {
                        MessageToast.show("Unauthorized branch selected");
                        return;
                    }
                }
                if (!aBranchesToUse.length) {
                    MessageToast.show("No authorized branches found");
                    return;
                }
                const sYear = this.byId("D_id_year").getValue();
                const sMonth = this.byId("D_id_month").getSelectedKey();
                const oUserBranch = aBranchesToUse.join(",");
                let StartDate;
                let EndDate;

                if (sYear) {
                    const iYear = parseInt(sYear, 10);
                    if (!sMonth) {
                        StartDate = iYear + "-01-01";
                        EndDate = iYear + "-12-31";
                    }
                    else {
                        const iMonth = parseInt(sMonth, 10);

                        const mStart = new Date(iYear, iMonth - 1, 1);
                        const mEnd = new Date(iYear, iMonth, 0);
                        const format = d =>
                            d.getFullYear() + "-" +
                            String(d.getMonth() + 1).padStart(2, "0") + "-" +
                            String(d.getDate()).padStart(2, "0");
                        StartDate = format(mStart);
                        EndDate = format(mEnd);
                    }
                }

                else {
                    StartDate = "2000-01-01";
                    EndDate = "2099-12-31";
                }
                let aFilteredBookings = (this._aAllBookings || []).filter(b =>
                    aBranchesToUse.includes(b.BranchCode)
                );
                aFilteredBookings = aFilteredBookings.filter(b => {
                    const d = new Date(b.BookingDate);
                    const formatted =
                        d.getFullYear() + "-" +
                        String(d.getMonth() + 1).padStart(2, "0") + "-" +
                        String(d.getDate()).padStart(2, "0");
                    return formatted >= StartDate && formatted <= EndDate;
                });
                this.dashboardSetDate(aFilteredBookings, aBranchesToUse);
                let oMonthPayload = {
                    BranchCode: oUserBranch,
                    StartDate: StartDate,
                    EndDate: EndDate
                };
                let oStatusPayload = {
                    BranchCode: oUserBranch,
                    StartDate: StartDate,
                    EndDate: EndDate
                };
                let oDailyPayload = {
                    BranchCode: oUserBranch,
                    StartDate: StartDate,
                    EndDate: EndDate
                };
                let oPaymentPayload = {
                    BranchCode: oUserBranch,
                    StartDate: StartDate,
                    EndDate: EndDate
                };
                await Promise.all([
                    this._loadMonthChart(oMonthPayload),
                    this._loadDayChart(oDailyPayload),
                    this._loadStatusChart(oStatusPayload),
                    this._loadPaymentTypeChart(oPaymentPayload)
                ]);
            } catch (err) {
                MessageToast.show("Failed to load charts");
            } finally {
                // sap.ui.core.BusyIndicator.hide();
                this.closeBusyDialog()
            }
        },

        _loadUserBranches: async function () {
            const oData = await this.ajaxReadWithJQuery("HM_Branch", {});
            let aAllBranches = Array.isArray(oData.data) ? oData.data : [oData.data];
            let aFiltered = aAllBranches.filter(b =>
                this._aUserBranches.includes(b.BranchID));
            this.getView().setModel(new JSONModel(aFiltered), "branchModel");
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
            const iMonth = new Date().getMonth() + 1;
            const iYear = new Date().getFullYear();
            this.byId("D_id_BranchCode").setSelectedKeys([]);
            this.byId("D_id_year").setValue(iYear);
            this.byId("D_id_month").setSelectedKey(iMonth);
        },

        onCardAction: function (oEvent) {
            const oParams = oEvent.getParameter("parameters");
            const sCustomerID = oParams.CustomerID;
            const sEncodedID = btoa(String(sCustomerID));

            this.getOwnerComponent().getRouter().navTo("RouteAdminDetails", {
                sPath: encodeURIComponent(sEncodedID),
                from: "Dashboard"
            });

        },

        onClickFilterBar: function () {
            const oFilterBar = this.byId("D_id_FilterbarEmployee");
            const bVisible = oFilterBar.getVisible();
            oFilterBar.setVisible(!bVisible);
        }
    })
})