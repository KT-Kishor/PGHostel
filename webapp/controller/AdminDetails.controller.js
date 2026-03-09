sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../utils/validation",
     "sap/ui/core/BusyIndicator",
     "sap/m/MessageToast",
     "sap/ui/model/FilterOperator",
      "sap/ui/model/Filter",

], function (BaseController, Formatter, JSONModel, MessageBox, utils,BusyIndicator, MessageToast,FilterOperator,Filter) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.AdminDetails", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteAdminDetails").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function (oEvent) {
            this._fromRoute = oEvent.getParameter("arguments").from;
            this._ViewDatePickersReadOnly(["Ad_id_editStartDate", "editEndDate", "AD_id_Date"], this.getView());
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            var model = new JSONModel(this.getOwnerComponent().getModel("LoginModel").getData());
            this.getView().setModel(model, "LoginModel");
            await this.getOwnerComponent().getModel("RateType").dataLoaded();

            var oRateTypeModel = this.getView().getModel("RateType");
            this._aOriginalRateTypes = JSON.parse(JSON.stringify(oRateTypeModel.getData()));

            const oUserModel = sap.ui.getCore().getModel("LoginModel");
            if (oUserModel) {
                this._oLoggedInUser = oUserModel.getData();
            } else {
                this._oLoggedInUser = {}; // fallback
            }

            this.Code = ""
            var model = new JSONModel({
                FacilityName: "",
                UnitText: "",
                Price: "",
                Currency: "",
                StartDate: "",
                EndDate: "",
                TotalDays: "",
                CouponCode: "",
                CouponDiscount: ""

            });
            this.getView().setModel(model, "edit")

            var model1 = new JSONModel({


            });
            this.getView().setModel(model1, "HostelModel")

            this.getView().setModel(new JSONModel({
                Amount: "",
                PaymentType: "UPI",
                PaymentDate: new Date()
            }), "PaymentModel");

            var model = new JSONModel({
                StartDate: "",
                EndDate: "",
                UnitText: "daily", // daily | monthly | yearly
                TotalMonths: 1,
                TotalYears: 1,
                BedTypeName: ""
            });
            this.getView().setModel(model, "Bookingmodel");
             this.flag=false

            var model = new JSONModel({
                visible: false,
                GSt: false,
                IsCouponApplied: false,
                showCancelButton: false

            });
            this.getView().setModel(model, "VisibleModel")
            this._sLoggedUserID = "";
            this.getView().setModel(new sap.ui.model.json.JSONModel({
                editable: true,
            }), "visiablityPlay");

            var sPath = oEvent.getParameter("arguments").sPath;
            this.decodedPath = atob(decodeURIComponent(sPath));
            this.valuestate()
            this.getBusyDialog()

            await this.OnRoom();

            await this.AD_onSearch()
            var oCustomerData = this.getView().getModel("CustomerData").getData();
            var VisibleModel = this.getView().getModel("VisibleModel")
            if (this._oLoggedInUser.Role === "Customer") {
                const bookingDate = new Date(oCustomerData.BookingDate);
                const now = new Date();

                let diffHours = (now - bookingDate) / (1000 * 60 * 60);

                if (diffHours > 24) {
                    // hide cancel button
                    VisibleModel.setProperty("/showCancelButton", true);
                } else {
                    // show cancel button
                    VisibleModel.setProperty("/showCancelButton", false);
                }
            }
              this.getView().setModel(new JSONModel({
                isOtpSelected: false,
                isPasswordSelected: true,
                authFlow: "signin",  // [signin, forgot, otp, reset]
                isOtpBoxVisible: false
            }), "LoginViewModel");

            const vm = this.getView().getModel("LoginViewModel");

            // Add only your required properties (safe, isolated)
            vm.setProperty("/loginMode", "password");   // "password" or "otp"
            vm.setProperty("/showOTPField", false);     // show OTP input box only after Send OTP success
            vm.setProperty("/isOtpEntered", false);
            this.getView().setModel(new JSONModel({ isEditMode: false }), "saveModel");

            vm.setProperty("/canResendOTP", true);
            vm.setProperty("/otpTimer", 0);
            vm.setProperty("/otpButtonText", "Send OTP");
              this.getView().setModel(new JSONModel({
                fullname: "",
                Email: "",
                Mobileno: "",
                password: "",
                comfirmpass: "",
                minDate: new Date(2000, 0, 1)
            }), "LoginMode");
         
        },

        valuestate: function () {
            this.getView().byId("Ad_id_RoomType").setValueState("None")
            this.getView().byId("idPaymentMethod1").setValueState("None")
            this.getView().byId("Ad_id_editStartDate").setValueState("None")
            this.getView().byId("editEndDate").setValueState("None")
            this.getView().byId("AD_id_CustomerName").setValueState("None")
            this.getView().byId("AD_id_Date").setValueState("None")
            this.getView().byId("Ad_id_gender").setValueState("None")
            this.getView().byId("Ad_id_CustomerEmail").setValueState("None")
            this.getView().byId("CC_id_Country").setValueState("None")
            this.getView().byId("CC_id_State").setValueState("None")
            this.getView().byId("CC_id_City").setValueState("None")
            this.getView().byId("CD_ID_idPhone").setValueState("None")
        },

        OnRoom: function () {
            return new Promise((resolve, reject) => {
                this.ajaxReadWithJQuery("HM_Rooms", "")
                    .then(oData => {
                        var aRooms = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
                        this.getView().setModel(new JSONModel(aRooms), "Availablebeds");
                        resolve();
                    })
                    .catch(reject);
            });
        },

        getBranchHotelData: function (filter) {
            return new Promise((resolve, reject) => {
                this.ajaxReadWithJQuery("getBranchHotelData", filter)
                    .then(oData => {
                        this.getView().setModel(new JSONModel(oData), "Beddetails");
                        resolve();
                    })
                    .catch(reject);
            });
        },
        Coupon: function () {
            var oCustomerData = this.getView().getModel("CustomerData").getData();
            const filter = {
                CouponCode: oCustomerData.CouponCode || "",
                Status: "Active"
            };
            this.ajaxReadWithJQuery("HM_Coupon", filter).then((oData) => {
                var aCoupon = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(aCoupon);
                this.getView().setModel(model, "CouponModel")

            });
        },

        onChekout: function () {
            var data = this.getView().getModel("CustomerData").getData()

            if (!this.CK_Dialog) {
                var oView = this.getView();
                this.CK_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Checkout", this);
                oView.addDependent(this.CK_Dialog);
            }
            sap.ui.getCore().byId("Ck_id_editStartDate").setValue(data.StartDate)
            sap.ui.getCore().byId("Ck_id_editEndDate").setValue(data.EndDate)

            this.CK_Dialog.open();
        },

        Ck_onCancelButtonPress: function () {
            this.CK_Dialog.close();

        },

        Ck_onsavebuttonpress: async function () {
            // Get edited data from Bookingmodel
            var oBookingData = this.getView().getModel("Bookingmodel").getData();

            // Update CustomerData model with edited dates
            var oCustomerModel = this.getView().getModel("CustomerData").getData();
            // Refresh model to update UI bindings

            var Payload = {
                "Booking": [{
                    "StartDate": oBookingData.StartDate.split('/').reverse().join('-'),
                    "EndDate": oBookingData.EndDate.split('/').reverse().join('-'),
                    "Status": "Completed",
                    "CustomerName": oCustomerModel.CustomerName,
                    "CustomerEmail": oCustomerModel.CustomerEmail,
                    "BookingID": oCustomerModel.BookingID,
                    "RoomNo": oCustomerModel.RoomNo
                }]
            };

            // Send payload
            this.getBusyDialog()
            await this.ajaxUpdateWithJQuery("HM_Customer", {
                data: [Payload],
                filters: {
                    CustomerID: oCustomerModel.CustomerID
                }
            })
                .then(() => {
                    sap.m.MessageToast.show(this.i18nModel.getText("customerCompletedsuccessfully"))
                });

            // Refresh models
            this.AD_onSearch();

            // Close dialog
            this.CK_Dialog.close();
        },

        applyCountryStateCityFilters: async function () {
            const oModel = this.getView().getModel("CustomerData");
            const oCountryCB = this.byId("CC_id_Country");
            const oStateCB = this.byId("CC_id_State");
            const oSourceCB = this.byId("CC_id_City");

            const sCountry = oModel.getProperty("/Country");
            const sState = oModel.getProperty("/State");
            const sSource = oModel.getProperty("/City");

            oStateCB.getBinding("items")?.filter([]);
            oSourceCB.getBinding("items")?.filter([]);

            if (sCountry) {
                const aCountryData = this.getOwnerComponent().getModel("CountryModel").getData();
                const oCountryObj = aCountryData.find(c => c.countryName === sCountry);

                if (oCountryObj) {
                    const sCountryCode = oCountryObj.code;

                    oStateCB.getBinding("items")?.filter([
                        new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                    ]);

                    if (sState) {
                        const aFilters = [
                            new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sState),
                            new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                        ];
                        oSourceCB.getBinding("items")?.filter(aFilters);
                    }
                }
            }

            oCountryCB.setValue(sCountry || "");
            oStateCB.setValue(sState || "");
            oSourceCB.setValue(sSource || "");
        },

        Facilitysearch: async function (sBranchCode, Deposit) {

            const oData = await this.ajaxReadWithJQuery("HM_ExtraFacilities", {
                BranchCode: sBranchCode
            });

            const aFacilities = Array.isArray(oData.data.data)
                ? oData.data.data
                : [oData.data.data];

            let aFilteredFacilities = aFacilities;

            // 🚀 If extrabed <= 0 → remove Extra Bed
            if (Deposit && Deposit.ExtraBed <= 0) {
                aFilteredFacilities = aFacilities.filter(function (oItem) {
                    return oItem.Type !== "Extra Bed";
                });
            }

            const oModel = new sap.ui.model.json.JSONModel(aFilteredFacilities);
            this.getView().setModel(oModel, "Facilities");

            return aFilteredFacilities;
        },

        onNavBack: function () {
            if (this._fromRoute === "Dashboard") {
                this.getOwnerComponent().getRouter().navTo("RouteDashboard");
            } else {

                const oLoginModel = this.getView().getModel("LoginModel");
                const sRole = oLoginModel?.getProperty("/Role") || "";
                const sEmpID = oLoginModel?.getProperty("/EmployeeID") || "";
                if (sRole === "Customer") {
                    this._sLoggedUserID = sEmpID;
                    const oUIModel = this.getOwnerComponent().getModel("UIModel");
                    oUIModel.setProperty("/isLoggedIn", true);
                    this.getOwnerComponent().getRouter().navTo("RouteManageProfile");
                } else if (sRole === "Admin" || sRole === "Branch Manager" || sRole === "Front Office Employee") {
                    this.getOwnerComponent().getRouter().navTo("RouteAdmin");
                } else {
                    this.getOwnerComponent().getRouter().navTo("RouteHostel");
                }

                this.getView().getModel("CustomerData").setData({});
            }
        },

        onHome: function () {
            const oUser = this._oLoggedInUser;
            const oUIModel = this.getOwnerComponent().getModel("UIModel");

            if (oUser && oUser.UserID) {
                oUIModel.setProperty("/isLoggedIn", true);
            } else {
                oUIModel.setProperty("/isLoggedIn", false);
            }
            var oRouter = this.getOwnerComponent().getRouter()
            oRouter.navTo("RouteHostel")
        },

        AD_onSearch: async function () {
            try {
                this.getBusyDialog()
                const filter = {
                    CustomerID: this.decodedPath
                };
                const response = await this.ajaxReadWithJQuery("HM_Customer", filter);
                const oCustomer = response?.Customers || response?.value?.[0] || {};

                const filterData = {
                    BranchCode: oCustomer.Bookings?.[0]?.BranchCode,
                    BranchID: oCustomer.Bookings?.[0]?.BranchCode
                };

                await this.getBranchHotelData(filterData)
                var abeds = this.getView().getModel("Beddetails").getData().HM_BedType
                var aPayment = this.getView().getModel("Beddetails").getData().HM_Payment
                var aBranch = this.getView().getModel("Beddetails").getData().HM_Branch

                var Paymentpaid = aPayment
                    .filter(item => item.CustomerID === oCustomer.CustomerID && item.Used !== "Y")
                    .reduce((sum, item) => sum + Number(item.Amount || 0), 0);

                var RefundPaymentpaid = aPayment
                    .filter(item => item.CustomerID === oCustomer.CustomerID && item.Used === "Y")
                    .reduce((sum, item) => sum + Number(item.Amount || 0), 0);


                var bedname = oCustomer.Bookings?.[0]?.BedType.replace(/\s*-\s*(AC|NON-AC)$/i, "").trim()
                var acname = oCustomer.Bookings?.[0]?.BedType.includes("NON-AC") ? "NON-AC" : "AC"


                var Deposit = abeds.find((item) => {
                    if (item.Name === bedname && item.BranchCode === oCustomer.Bookings?.[0]?.BranchCode
                        && item.ACType === acname) {
                        return item.Deposit
                    }
                })

                var Branch = aBranch.find((item) => {
                    return item.BranchID === oCustomer.Bookings?.[0]?.BranchCode

                })

                const oCustomerData = {
                    CustomerName: oCustomer.CustomerName,
                    CustomerID: oCustomer.CustomerID,
                    Gender: oCustomer.Gender,
                    MobileNo: oCustomer.MobileNo,
                    DateOfBirth: this.Formatter.DateFormat(oCustomer.DateOfBirth),
                    UserID: oCustomer.UserID,
                    CustomerEmail: oCustomer.CustomerEmail,
                    Country: oCustomer.Country,
                    State: oCustomer.State,
                    City: oCustomer.City,
                    STDCode: oCustomer.STDCode || "",
                    Salutation: oCustomer.Salutation || "Mr.",
                    Address: oCustomer.PermanentAddress,
                    // RentPrice: oCustomer.Bookings?.[0]?.RentPrice || 0,
                    // OrginalRentPrice: oCustomer.Bookings?.[0]?.RoomPrice || 0,
                    BedType: oCustomer.Bookings?.[0]?.BedType || "",
                    BookingDate: new Date(oCustomer.Bookings?.[0]?.BookingDate || ""),

                    BookingID: oCustomer.Bookings?.[0]?.BookingID || "",
                    BranchCode: oCustomer.Bookings?.[0]?.BranchCode || "",
                    NoOfPersons: oCustomer.Bookings?.[0]?.NoOfPersons || "",
                    PaymentType: oCustomer.Bookings?.[0]?.PaymentType || "",
                    Status: oCustomer.Bookings?.[0]?.Status || "",
                    Person: oCustomer.Bookings?.[0]?.NoOfPersons || "",
                    RoomNo: oCustomer.Bookings?.[0]?.RoomNo || "",
                    Currency: oCustomer.Bookings?.[0]?.Currency || "",
                    Discount: oCustomer.Bookings?.[0]?.Discount || "",
                    CouponCode: oCustomer.Bookings?.[0]?.CouponCode || "",
                    Deposit: Deposit.Deposit || "0.00",
                    PaymentPaid: Paymentpaid || "0.00",
                    RefundPaymentpaid: RefundPaymentpaid || "0.00",
                    StartDate: this.Formatter.DateFormat(oCustomer.Bookings?.[0]?.StartDate || ""),
                    minStartDate: new Date(oCustomer.Bookings?.[0]?.StartDate || ""),
                    GSTType: oCustomer.Bookings?.[0]?.GSTType || "",
                    GSTValue: oCustomer.Bookings?.[0]?.GSTValue || "",
                    GSTIN: Branch.GSTIN || "",
                    BranchName: Branch.Name || "",
                    GSTNumber: oCustomer.Bookings?.[0]?.CustomerGSTIN || "",
                    EndDate: this.Formatter.DateFormat(oCustomer.Bookings?.[0]?.EndDate || ""),
                    minEndDate: new Date(oCustomer.Bookings?.[0]?.EndDate || ""),

                    AllSelectedFacilities: oCustomer.FaciltyItems || [],
                    Documents: oCustomer.Documents || []
                };
                let sDate = this.Formatter.DateFormat(oCustomer.Bookings?.[0]?.BookingDate || "");

                if (sDate) {
                    let parts = sDate.split("/");
                    let oDate = new Date(parts[2], parts[1] - 1, parts[0]);
                    oCustomer.BookingDate = oDate;
                }
                this.byId("Ad_id_editStartDate").setMinDate(oCustomer.BookingDate)
                this.byId("editEndDate").setMinDate(oCustomer.BookingDate)
                // Prepare for calculation
                const aPersons = [{
                    FullName: oCustomer.CustomerName,
                    Facilities: {
                        SelectedFacilities: oCustomer.FaciltyItems || []
                    }
                }];

                // Calculate totals
                var sBranchCode = oCustomer.Bookings?.[0]?.BranchCode
                var BedType = oCustomer.Bookings?.[0]?.BedType
                var PaymentType = oCustomer.Bookings?.[0]?.PaymentType

                //  var Country=this.getView().getModel("sBRModel").getData().find((item)=>{
                //      return item.BranchCode===sBranchCode
                //  })

                //   var oModel = new sap.ui.model.json.JSONModel(Country);

                //     this.getView().setModel(oModel, "Country");

                // await this.ajaxReadWithJQuery("HM_Rooms", "").then((oData) => {
                //     var aRooms = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];

                //     var aFilteredRooms = aRooms.filter(function (room) {
                //         return room.BranchCode === sBranchCode;
                //     });


                //     // set only filtered data to the model
                //     var model = new sap.ui.model.json.JSONModel(aFilteredRooms);
                //     this.getView().setModel(model, "Availablebeds");

                //     var RoomBedprice = aFilteredRooms.filter(function (item) {
                //         return item.BedTypeName === BedType
                //     });
                // })
                var aAllRooms = this.getView().getModel("Availablebeds").getData();

                // Filter by BranchCode
                var aFilteredRooms = aAllRooms.filter(function (room) {
                    return room.BranchCode === sBranchCode;
                });

                // Set the filtered rooms to Availablebeds model if you want
                this.getView().getModel("Availablebeds").setData(aFilteredRooms);

                // Now filter by BedTypeName for Availablebedprice
                var RoomBedprice = aFilteredRooms.filter(function (item) {
                    return item.BedTypeName === BedType;
                });

                // Set to new model
                var oModel = new sap.ui.model.json.JSONModel(RoomBedprice);
                this.getView().setModel(oModel, "Availablebedprice");

                var Availablebedprice = this.getView().getModel("Availablebedprice").getData()

                let roomRentPrice = 0;

                if (PaymentType === "Per Month") {
                    roomRentPrice = Availablebedprice[0].MonthPrice;
                    oCustomerData.OrginalRentPrice = Availablebedprice[0].MonthPrice;

                } else if (PaymentType === "Per Day") {
                    roomRentPrice = Availablebedprice[0].Price;
                    oCustomerData.OrginalRentPrice = Availablebedprice[0].Price;

                } else if (PaymentType === "Per Year") {
                    roomRentPrice = Availablebedprice[0].YearPrice;
                    oCustomerData.OrginalRentPrice = Availablebedprice[0].YearPrice;

                }

                let Duration = 0;
                let DurationUnit = "";

                const sStartDateRaw = oCustomer.Bookings?.[0]?.StartDate;
                const sEndDateRaw = oCustomer.Bookings?.[0]?.EndDate;

                if (sStartDateRaw && sEndDateRaw) {

                    const start = new Date(sStartDateRaw);
                    const end = new Date(sEndDateRaw);

                    const paymentType = (oCustomer.Bookings?.[0]?.PaymentType || "").toLowerCase();

                    // Difference in milliseconds
                    const diffMs = end - start;

                    if (paymentType === "per day") {
                        Duration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        DurationUnit = Duration === 1 ? "Day" : "Days";


                    } else if (paymentType === "per month") {
                        const years = end.getFullYear() - start.getFullYear();
                        const months = end.getMonth() - start.getMonth();
                        let totalMonths = years * 12 + months;

                        // If end day >= start day, add 1 month
                        if (end.getDate() >= start.getDate()) {
                            totalMonths += 1;
                        }

                        Duration = totalMonths;
                        DurationUnit = Duration === 1 ? "Month" : "Months";


                    }
                    else if (paymentType === "per year") {
                        let years = end.getFullYear() - start.getFullYear();

                        // If end month > start month OR same month and end day >= start day, add 1
                        if (
                            end.getMonth() > start.getMonth() ||
                            (end.getMonth() === start.getMonth() && end.getDate() >= start.getDate())
                        ) {
                            years += 1;
                        }

                        Duration = years;
                        DurationUnit = Duration === 1 ? "Year" : "Years";

                    }
                }
                oCustomerData.RentPrice = Duration * roomRentPrice;
                this.RentPrice = Duration * roomRentPrice;

                oCustomerData.Discount = oCustomer.Bookings?.[0]?.Discount || "0.00";

                // Add duration to model
                oCustomerData.Duration = Duration;
                oCustomerData.DurationUnit = DurationUnit;
                var sBranchCode = oCustomer.Bookings?.[0]?.BranchCode
                await this.Facilitysearch(sBranchCode, Deposit)
                const totals = this.calculateTotals(aPersons, oCustomerData.RentPrice, sBranchCode, oCustomerData.Discount, oCustomer);
                if (totals) {
                    Object.assign(oCustomerData, totals);
                }
                oCustomerData.DueAmount = oCustomerData.GrandTotal - oCustomerData.PaymentPaid + Number(oCustomerData.RefundPaymentpaid);
                const oCustomerModel = new sap.ui.model.json.JSONModel(oCustomerData);

                this.getView().setModel(oCustomerModel, "CustomerData");

                // Now it is available here:
                // Set model
            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog()
            }
        },

        calculateTotals: function (aPersons, roomRentPrice, sBranchCode, Discount, oCustomer) {
            var Facilitiesdata = this.getView().getModel("Facilities").getData()

            let totalFacilityPricePerDay = 0;
            let otherFacilitiesTotal = 0;
            let aAllFacilities = [];

            aPersons.forEach((oPerson, iIndex) => {

                const aFacilities = oPerson.Facilities?.SelectedFacilities || [];

                aFacilities.forEach((f) => {

                    var FacilityBasicprice = Facilitiesdata.find((item) => {
                        return item.FacilityName === f.FacilityName && item.BranchCode === sBranchCode
                    }
                    )
                    if (f.UnitText === "Per Day") {
                        FacilityBasicprice = FacilityBasicprice.PerDayPrice
                    } else if (f.UnitText === "Per Month") {
                        FacilityBasicprice = FacilityBasicprice.PerMonthPrice
                    } else if (f.UnitText === "Per Year") {
                        FacilityBasicprice = FacilityBasicprice.PerYearPrice
                    } else if (f.UnitText === "Per Hour") {
                        FacilityBasicprice = FacilityBasicprice.PerHourPrice
                    }

                    const fPrice = parseFloat(f.FacilitiPrice || 0);

                    const unit = f.UnitText;

                    let fTotal = 0;

                    // -------------------------------
                    // Facility specific dates
                    // -------------------------------
                    const facStart = new Date(f.StartDate);
                    const facEnd = new Date(f.EndDate);

                    if (!facStart || !facEnd) {
                        console.warn("Missing dates for facility:", f);
                        return;
                    }

                    // -------------------------------
                    // Calculate Days
                    // -------------------------------
                    facStart.setHours(0, 0, 0, 0);
                    facEnd.setHours(0, 0, 0, 0);
                    const dayDiff = facEnd - facStart;
                    let days = 0;
                    if (unit === "Per Day" || unit === "Per Hour") {
                        days = dayDiff / (1000 * 60 * 60 * 24); // inclusive
                    } else {
                        days = dayDiff / (1000 * 60 * 60 * 24); // for months/years we don't use days
                    }


                    // if (days <= 0) {
                    //     console.warn("Invalid facility date range:", f);
                    //     return;
                    // } 

                    // -------------------------------
                    // Calculate Months
                    // -------------------------------
                    let months =
                        (facEnd.getFullYear() - facStart.getFullYear()) * 12 +
                        (facEnd.getMonth() - facStart.getMonth());

                    if (facEnd.getDate() >= facStart.getDate()) {
                        months += 1;
                    }

                    const totalMonths = Math.max(months, 1);


                    // -------------------------------
                    // Calculate Years
                    // -------------------------------
                    const years = Math.floor(months / 12);
                    const totalYears = Math.max(years, 1);

                    // -------------------------------
                    // Apply Billing Logic
                    // -------------------------------
                    if (unit === "Per Day") {
                        fTotal = fPrice;
                        totalFacilityPricePerDay += fPrice;

                    } else if (unit === "Per Month") {
                        f.TotalHour = totalMonths;
                        fTotal = fPrice;
                        otherFacilitiesTotal += fTotal;

                    } else if (unit === "Per Year") {
                        f.TotalHour = totalYears;
                        fTotal = fPrice;
                        otherFacilitiesTotal += fTotal;
                    } else if (unit === "Per Hour") {
                        const totalHours = f.TotalHour || 0;
                        fTotal = fPrice;
                        otherFacilitiesTotal += fTotal;
                    }

                    // -------------------------------
                    // Store final facility record
                    // -------------------------------
                    aAllFacilities.push({
                        PersonName: oPerson.FullName || `Person ${iIndex + 1}`,
                        FacilityName: f.FacilityName,
                        FacilityID: f.FacilityID,
                        UnitText: unit,
                        Price: FacilityBasicprice,
                        StartDate: this.Formatter.DateFormat(f.StartDate),
                        EndDate: this.Formatter.DateFormat(f.EndDate),
                        TotalDays: days,
                        TotalMonths: totalMonths,
                        TotalYears: totalYears,
                        TotalAmount: fTotal,
                        TotalHour: f.TotalHour,
                        Image: f.Image,
                        Currency: f.Currency,
                        EndTime: f.EndTime,
                        StartTime: f.StartTime,
                        CouponCode: f.CouponCode || "",
                        CouponDiscount: f.CouponDiscount || "0.00"
                    });

                });
            });

            // -------------------------------
            // Final Price Calculation
            // -------------------------------
            // const FacilityPrice = totalFacilityPricePerDay + otherFacilitiesTotal;
            // let DiscountAmount = Discount || 0;
            // const SubTotal = FacilityPrice + roomRentPrice - DiscountAmount;

            // let SGST = 0;
            // let CGST = 0;
            // let IGST = 0;
            // let grandTotal = 0;
            // if(Branch.Type==="IGST"){
            //  IGST = SubTotal * Branch.Value / 100;
            //  grandTotal = SubTotal + SGST + CGST;

            // }else{       
            //  SGST = SubTotal * Branch.Value / 100;
            //  CGST = SubTotal * Branch.Value / 100;
            //  grandTotal = SubTotal + SGST + CGST;

            // }
            const FacilityPrice = totalFacilityPricePerDay + otherFacilitiesTotal;
            this.FacilityPrice = totalFacilityPricePerDay + otherFacilitiesTotal;

            let DiscountAmount = Discount || 0;
            const SubTotal = FacilityPrice + roomRentPrice;

            let SGST = 0;
            let CGST = 0;
            let IGST = 0;
            let grandTotal = 0;
            if (oCustomer.Bookings?.[0]?.GSTType === "IGST") {
                IGST = SubTotal * oCustomer.Bookings?.[0]?.GSTValue / 100;
                grandTotal = SubTotal + IGST - DiscountAmount;

            } else {
                SGST = SubTotal * oCustomer.Bookings?.[0]?.GSTValue / 100;
                CGST = SubTotal * oCustomer.Bookings?.[0]?.GSTValue / 100;
                grandTotal = SubTotal + SGST + CGST - DiscountAmount;

            }
            this.grandTotal = grandTotal;

            // Attach facility price to each entry
            aAllFacilities = aAllFacilities.map(item => ({
                ...item,
                FacilityPrice: FacilityPrice
            }));

            return {
                FacilityPrice: FacilityPrice,
                TotalFacilityPrice: FacilityPrice,
                GrandTotal: grandTotal,
                SGST: SGST,
                CGST: CGST,
                IGST: IGST,
                SubTotal: SubTotal,
                AllSelectedFacilities: aAllFacilities
            };
        },

        _parseDate: function (sDate) {
            const aParts = sDate.split("/");
            return new Date(aParts[2], aParts[1] - 1, aParts[0]);
        },

        Ad_onPressEdit: async function () {
            const oView = this.getView();
            const oVisibilityModel = oView.getModel("visiablityPlay");
            const bEditMode = oVisibilityModel.getProperty("/editable");
            const oCustomerData = oView.getModel("CustomerData").getData();

            if (!bEditMode) {
                // Switch to edit mode
                oVisibilityModel.setProperty("/editable", true);
            } else {
                // Save (update)
                try {
                    this.getBusyDialog()

                    // Construct payload for update
                    const oPayload = {
                        CustomerID: this.decodedPath,
                        CustomerName: oCustomerData.CustomerName,
                        Gender: oCustomerData.Gender,
                        MobileNo: oCustomerData.MobileNo,
                        CustomerEmail: oCustomerData.CustomerEmail,
                        Country: oCustomerData.Country,
                        State: oCustomerData.State,
                        City: oCustomerData.City,
                        Bookings: [{
                            BedType: oCustomerData.BedType,
                            RentPrice: oCustomerData.RentPrice,
                            PaymentType: oCustomerData.PaymentType,
                            NoOfPersons: oCustomerData.Person,
                            StartDate: this._formatDateForAPI(oCustomerData.StartDate),
                            EndDate: this._formatDateForAPI(oCustomerData.EndDate)
                        }]
                    };

                    // Use your common AJAX update helper
                    await this.ajaxUpdateWithJQuery("HM_Customer", oPayload);
                    sap.m.MessageToast.show(this.i18nModel.getText("customerDetailsUpdatedSuccessfully"));

                    // Switch back to view mode
                    oVisibilityModel.setProperty("/editable", false);
                } catch (err) {
                    sap.m.MessageBox.error("Failed to Update Data: " + (err.message || err.responseText));
                } finally {
                    this.closeBusyDialog()
                }
            }
        },

        onAddFacilityDetails: function () {
            var data = this.getView().getModel("Bookingmodel").getData()
            this._editIndex = undefined;
            this.byId("Ad_id_idFacilityRoomTableDetails").removeSelections()
            if (!this.HM_Dialog) {
                var oView = this.getView();
                this.HM_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Admin_Edit", this);
                oView.addDependent(this.HM_Dialog);
            }
            this.HM_Dialog.open();
            sap.ui.getCore().byId("ID_editCouponCode").setShowValueHelp(false);
            this.getView().getModel("edit").setData({
                FacilityName: "",
                UnitText: "",
                Price: "",
                Currency: "",
                StartDate: "",
                EndDate: "",
                TotalDays: "",
                TotalMonths: "",
                TotalYears: "",
                NewStartDate: "",
                NewEndDate: ""
            });
            sap.ui.getCore().byId("idUnitType").setVisible(false).setValueState("None")
            sap.ui.getCore().byId("editStartTime").setVisible(false).setValueState("None")
            sap.ui.getCore().byId("editEndTime").setVisible(false).setValueState("None")
            sap.ui.getCore().byId("editHours").setVisible(false)
            sap.ui.getCore().byId("editFacilityName").setValueState("None")
            sap.ui.getCore().byId("editStartDate").setValueState("None")
            sap.ui.getCore().byId("editEndDate").setValueState("None")
            sap.ui.getCore().byId("idMonthYearSelectFragment").setSelectedKey("1")
            this.getView().getModel("CustomerData").setProperty("/minStartDate", new Date(data.StartDate.split("/").reverse().join("-")));
            this.getView().getModel("CustomerData").setProperty("/minEndDate", new Date(data.EndDate.split("/").reverse().join("-")));

        },

        onEditDialogClose: function () {
            this.byId("Ad_id_idFacilityRoomTableDetails").removeSelections()
            this.iCount = 1;
            this.HM_Dialog.close();
        },

        onFacilityChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");

            var oUnitType = sap.ui.getCore().byId("idUnitType");
            sap.ui.getCore().byId("editPrice").setValue("");
            sap.ui.getCore().byId("FU_id_Currency").setSelectedKey("");

            // 1. Selected Facility Key
            var sSelectedFacility = oEvent.getSource().getSelectedKey();

            // 2. Get Facilities Model
            var oFacilitiesModel = this.getView().getModel("Facilities");
            var aFacilities = oFacilitiesModel.getData();

            // 3. Get RateType Model
            // 4. Get selected facility data
            var oSelectedFacility = aFacilities.find(f => f.FacilityName === sSelectedFacility);
            if (!oSelectedFacility) return;

            // 5. Get booking unitText
            var oBookingModel = this.getView().getModel("Bookingmodel");
            var sUnitText = oBookingModel.getProperty("/UnitText");// assuming the field is unitText
            var OrginalRentPrice = this.getView().getModel("CustomerData").getProperty("/OrginalRentPrice")

            if (OrginalRentPrice === "0.00") {
                sap.m.MessageToast.show(this.i18nModel.getText("diffBooking"));
                this.HM_Dialog.close();
                return;
            }

            // 6. Define allowed rate types based on booking unitText
            var aAllowedRateTypes = [];
            if (sUnitText === "Per Month" || sUnitText === "monthly") {
                aAllowedRateTypes = ["Per Month", "Per Day", "Per Hour"];
            } else if (sUnitText === "Per Day" || sUnitText === "daily") {
                aAllowedRateTypes = ["Per Day", "Per Hour"];
            } else if (sUnitText === "Per Hour") {
                aAllowedRateTypes = ["Per Hour"];
            } else {
                aAllowedRateTypes = ["Per Day", "Per Month", "Per Year", "Per Hour"];
            }
            var _aOriginalRateTypes = [
                { "RateType": "Per Day" },
                { "RateType": "Per Hour" },
                { "RateType": "Per Month" },
                { "RateType": "Per Year" }
            ]
            // 7. Filter RateType based on facility price AND booking unitText
            var aFilteredRateTypes = _aOriginalRateTypes.filter(rt => {
                if (!aAllowedRateTypes.includes(rt.RateType)) {
                    return false;
                }
                if (rt.RateType === "Per Day") return Number(oSelectedFacility.PerDayPrice) !== 0;
                if (rt.RateType === "Per Month") return Number(oSelectedFacility.PerMonthPrice) !== 0;
                if (rt.RateType === "Per Year") return Number(oSelectedFacility.PerYearPrice) !== 0;
                if (rt.RateType === "Per Hour") return Number(oSelectedFacility.PerHourPrice) !== 0;
                return true;
            });
            var oRateTypeModel = this.getView().getModel("RateType");

            // 8. Set filtered data back to RateType model
            oRateTypeModel.setData(aFilteredRateTypes);

            // 9. Show UnitType dropdown
            oUnitType.setSelectedKey("").setVisible(true);
        },

        onUnitTextChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
            var editdata = this.getView().getModel("edit")
            var data = this.getView().getModel("Facilities").getData()
            var Sfacilityname = sap.ui.getCore().byId("editFacilityName").getValue() || editdata.getProperty("/FacilityName")

            var Duration = sap.ui.getCore().byId("idUnitType").getSelectedKey();

            var FPrice = data.find((item) => {
                return item.FacilityName === Sfacilityname
            })
            editdata.setProperty("/Currency", FPrice.Currency)

            if (Duration === "Per Day") {
                editdata.setProperty("/Price", FPrice.PerDayPrice)
            }
            if (Duration === "Per Hour") {
                editdata.setProperty("/Price", FPrice.PerHourPrice)
                // sap.ui.getCore().byId("editStartTime").setVisible(true)
                // sap.ui.getCore().byId("editEndTime").setVisible(true)
                // sap.ui.getCore().byId("editHours").setVisible(true)
                editdata.setProperty("/UnitText", Duration)

            }
            if (Duration === "Per Month") {
                editdata.setProperty("/Price", FPrice.PerMonthPrice)
            }
            if (Duration === "Per Year") {
                editdata.setProperty("/Price", FPrice.PerYearPrice)
            }
            editdata.setProperty("/StartDate", "")
            editdata.setProperty("/EndDate", "")

            editdata.setProperty("/TotalDays", "")
            editdata.setProperty("/CouponCode", "")
            editdata.setProperty("/CouponDiscount", "")
            sap.ui.getCore().byId("ID_editCouponCode").setShowValueHelp(false)
            sap.ui.getCore().byId("idMonthYearSelectFragment").setSelectedKey("1")
        },

        onEditDateChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            const oModel = this.getView().getModel("edit");
            const sUnit = oModel.getProperty("/UnitText");
            let sStartDate = oModel.getProperty("/StartDate"); // use let to allow reassignment
            let sEndDate = oModel.getProperty("/EndDate"); // use let

            if (!sUnit || !sStartDate) return;

            const oSelect =
                this.byId("idMonthYearSelectFragment") ||
                sap.ui.getCore().byId(this.getView().createId("idMonthYearSelectFragment"));

            let iCount = 1;
            if (oSelect) {
                const sKey = oSelect.getSelectedKey();
                iCount = sKey ? Number(sKey) : 1;
            } else {
                iCount = this.iCount || 1;
            }

            if (!iCount || iCount <= 0) return;

            // ✅ Correct date conversion
            if (sStartDate.includes("/")) {
                sStartDate = sStartDate.split("/").reverse().join("-");

            }
            if (sEndDate.includes("/")) {
                sEndDate = sEndDate.split("/").reverse().join("-");
            }

            let oStart = new Date(sStartDate);
            let oEnd = sEndDate ? new Date(sEndDate) : null;
            //   var oEndDatePicker = sap.ui.getCore().byId("editEndDate");



            // if (oEndDatePicker) {
            //     var oDate = new Date(sStartDate);
            //      oDate.setDate(oDate.getDate() + 1);
            //       oEndDatePicker.setMinDate(oDate);
            // }
            //     if (oEnd <= oStart) {
            //         // Clear EndDate
            //         oModel.setProperty("/EndDate", "");
            //         if (oEndDatePicker) oEndDatePicker.setValue("");

            //         return;
            //     }
            let iDays = 0;


            if (sUnit === "Per Month" || sUnit === "monthly") {
                oEnd = new Date(oStart);
                oEnd.setMonth(oEnd.getMonth() + iCount);
                oEnd.setDate(oEnd.getDate() - 1)
            } else if (sUnit === "Per Year" || sUnit === "yearly") {

                oEnd = new Date(oStart);
                oEnd.setFullYear(oEnd.getFullYear() + iCount);
                oEnd.setDate(oEnd.getDate() - 1)

            } else if (sUnit === "Per Day" || sUnit === "daily" || sUnit === "Per Hour") {
                if (!oEnd) {
                    iDays = 1;
                }
                else if (oEnd && oEnd.getTime() <= oStart.getTime()) {
                    oModel.setProperty("/EndDate", "");

                    iDays = 1;
                    oModel.setProperty("/TotalDays", iDays);

                    return;
                }

                else if (oStart <= oEnd) {
                    iDays = Math.ceil((oEnd - oStart) / (1000 * 60 * 60 * 24));
                } else {
                    oEnd = null;
                    iDays = 0;
                }
            }
            if (oEnd && iDays === 0) {
                iDays = Math.floor((oEnd - oStart) / (1000 * 60 * 60 * 24));
            }

            // Update model
            oModel.setProperty("/EndDate", oEnd ? this.Formatter.formatDate(oEnd.toISOString().split("T")[0]) : "");
            oModel.setProperty("/TotalDays", iDays);
            oModel.setProperty("/CouponCode", "")
            oModel.setProperty("/CouponDiscount", "")
            sap.ui.getCore().byId("ID_editCouponCode").setShowValueHelp(false)
        },

        onMonthYearChange: function (oEvent) {
            const oModel = this.getView().getModel("edit");
            const iCount = Number(oEvent.getSource().getSelectedKey());

            this.iCount = iCount
            const sUnit = oModel.getProperty("/UnitText");
            const sStartDate = oModel.getProperty("/StartDate");

            if (!sStartDate) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectStartDateFirst"));
                return;
            }

            // Convert start date
            let oStart;
            if (sStartDate.includes("/")) {
                const parts = sStartDate.split("/").reverse().join("-");

                oStart = new Date(parts);
            } else {
                // Already yyyy-mm-dd
                oStart = new Date(sStartDate);
            }
            let oEnd = new Date(oStart);
            let iDays = 0;

            if (sUnit === "Per Month") {
                oEnd.setMonth(oEnd.getMonth() + iCount);
                oEnd.setDate(oEnd.getDate() - 1)

            } else if (sUnit === "Per Year") {
                oEnd.setFullYear(oEnd.getFullYear() + iCount);
                oEnd.setDate(oEnd.getDate() - 1)
            }
            if (oEnd && iDays === 0) {
                iDays = Math.floor((oEnd - oStart) / (1000 * 60 * 60 * 24));
            }

            // Format yyyy-MM-dd for DatePicker
            const sFormatted = oEnd.toISOString().split("T")[0];

            oModel.setProperty("/EndDate", this.Formatter.formatDate(sFormatted));
            oModel.setProperty("/TotalDays", iDays);
            oModel.setProperty("/CouponCode", "")
            oModel.setProperty("/CouponDiscount", "")
            sap.ui.getCore().byId("ID_editCouponCode").setShowValueHelp(false)
        },

        onEditFacilitySave: function () {
            var oCustomerModel = this.getView().getModel("CustomerData");
            var oCustomerData = oCustomerModel.getData();
            var oPayload = this.getView().getModel("edit").getData();

            oPayload.CouponCode = oPayload.CouponCode ? oPayload.CouponCode : sap.ui.getCore().byId("ID_editCouponCode").getValue() || "";

            if (oPayload.UnitText === "Per Month") {
                var Month = sap.ui.getCore().byId("idMonthYearSelectFragment").getSelectedKey();
                oPayload.TotalHour = Month || "1";
            } else if (oPayload.UnitText === "Per Year") {
                var Month = sap.ui.getCore().byId("idMonthYearSelectFragment").getSelectedKey();
                oPayload.TotalHour = Month || "1";
            }

            if (oPayload.CouponCode) {
                var oModel = this.getView().getModel("CouponModel");
                var oCouponData = oModel && Array.isArray(oModel.getData())
                    ? oModel.getData()
                    : [];
                var oCoupon = oCouponData.find(c => c.CouponCode === oPayload.CouponCode);
                if (oPayload.UnitText === "Per Month") {
                    var subtotal = oPayload.Price * (oPayload.TotalUnits || 1)
                } else if (oPayload.UnitText === "Per Year") {
                    var subtotal = oPayload.Price * (oPayload.TotalUnits || 1)
                } else if (oPayload.UnitText === "Per Day") {
                    var subtotal = oPayload.Price * (oPayload.TotalDays || 1)
                } else if (oPayload.UnitText === "Per Hour") {
                    var subtotal = oPayload.Price * oPayload.TotalHour * oPayload.TotalDays
                }

                oCoupon.MinOrderValue = Number(oCoupon.MinOrderValue)
                if (oCoupon.MinOrderValue > subtotal) {
                    sap.m.MessageToast.show("Coupon not Applicable for Below Minimum Value" + ' ' + oCoupon.MinOrderValue);
                    return;
                }
            }

            if (
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId("editFacilityName"), "ID") &&
                // utils._LCstrictValidationComboBox(oView.byId("idBedType"), "ID") &&
                (utils._LCstrictValidationComboBox(sap.ui.getCore().byId("idUnitType"), "ID")) &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("editStartDate"), "ID") &&
                // utils._LCvalidateMandatoryField(oView.byId("idRoomNumber13"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("editEndDate"), "ID")

            ) {
                if (oPayload.UnitText === "Per Hour") {
                    var oStartTime = sap.ui.getCore().byId("editStartTime");
                    var oEndTime = sap.ui.getCore().byId("editEndTime");

                    // Validate Start Time
                    if (!utils._LCvalidateMandatoryField(oStartTime, "ID")) {
                        sap.m.MessageToast.show(this.i18nModel.getText("pleaseEnterStartTime"));
                        return;
                    }

                    // Validate End Time
                    if (!utils._LCvalidateMandatoryField(oEndTime, "ID")) {
                        sap.m.MessageToast.show(this.i18nModel.getText("pleaseEnterEndTime"));
                        return;
                    }

                    // Get actual time values
                    var sStartTime = oStartTime.getValue(); // assuming format HH:MM
                    var sEndTime = oEndTime.getValue();

                    // Convert to Date objects for comparison
                    var start = new Date("1970-01-01T" + sStartTime + ":00");
                    var end = new Date("1970-01-01T" + sEndTime + ":00");

                    // Check if Start Time is greater than or equal to End Time
                    if (start >= end) {
                        sap.m.MessageToast.show(this.i18nModel.getText("startTimeShouldbeLessthanEndTime"));
                        return;
                    }
                }

                if (oCustomerData.minEndDate <= new Date(this._parseDate(oPayload.EndDate))) {
                    sap.m.MessageToast.show(this.i18nModel.getText("facilityEndDateExceedsBookingEndDate"));
                    return;
                }

                if (oPayload.CouponDiscount === "" && oPayload.CouponCode) {
                    sap.m.MessageToast.show(this.i18nModel.getText("pleaseapplycouponcode"));
                    return;
                }

                // Format Dates
                if (oPayload.StartDate.includes("-")) {
                    oPayload.StartDate = this.Formatter.DateFormat(oPayload.StartDate);
                } else {
                    oPayload.StartDate = oPayload.StartDate;
                }

                if (oPayload.EndDate.includes("-")) {
                    oPayload.EndDate = this.Formatter.DateFormat(oPayload.EndDate);

                } else {

                    oPayload.EndDate = oPayload.EndDate;
                }
                // BASE PRICE
                var basePrice = Number(oPayload.Price) || 0;
                var iDays = Number(oPayload.TotalDays) || 0;
                var iHours = Number(oPayload.TotalHour) || 0; // ← NEW for Per Hour

                var finalPrice = 0;
                const iCount = oPayload.TotalHour || 1;

                // CALCULATE PRICE BASED ON UNIT
                if (oPayload.UnitText === "Per Day") {
                    finalPrice = basePrice * iDays;
                } else if (oPayload.UnitText === "Per Month") {
                    finalPrice = basePrice * iCount;
                } else if (oPayload.UnitText === "Per Year") {
                    finalPrice = basePrice * iCount;
                } else if (oPayload.UnitText === "Per Hour") {
                    // ✅ Newly Added Hour Calculation
                    finalPrice = basePrice * iHours * iDays;
                }
                if (oPayload.CouponDiscount !== "") {
                    finalPrice = finalPrice - (Number(oPayload.CouponDiscount) || 0);
                }
                oPayload.TotalAmount = finalPrice;
                oPayload.TotalMonths = oPayload.TotalUnits || "1"
                oPayload.TotalYears = oPayload.TotalUnits || "1"


                // Remove unwanted fields

                // Ensure array exists
                if (!oCustomerData.AllSelectedFacilities) {
                    oCustomerData.AllSelectedFacilities = [];
                }

                // UPDATE existing OR ADD new
                if (this._editIndex !== undefined) {
                    oCustomerData.AllSelectedFacilities[this._editIndex] =
                        JSON.parse(JSON.stringify(oPayload));
                } else {
                    oCustomerData.AllSelectedFacilities.push(
                        JSON.parse(JSON.stringify(oPayload))
                    );
                }

                // Recalculate totals
                var total = 0;
                oCustomerData.AllSelectedFacilities.forEach(function (fac) {
                    total += Number(fac.TotalAmount) || 0;
                });

                oCustomerData.TotalFacilityPrice = total;

                // if (oCustomerData.CouponCode || this.Code) {
                //     var oCouponData = this.getView().getModel("CouponModel").getData();
                //     var sEnteredCode = this.Code || oCustomerData.CouponCode; // user entered code
                //     var oMatchedCoupon = oCouponData.find(coupon => coupon.CouponCode === sEnteredCode);

                //     if (oMatchedCoupon.MinOrderValue <= (total + (oCustomerData.RentPrice || 0))) {

                //         if (oMatchedCoupon.DiscountType === "Percentage" && this.CouponDiscount || oMatchedCoupon.DiscountType === "Percentage" && oCustomerData.Discount) {
                //             this.CouponDiscount = this.CouponDiscount || oMatchedCoupon.DiscountValue || "0"
                //             oCustomerData.Discount = (total + (oCustomerData.RentPrice || 0)) * Number(this.CouponDiscount) / 100
                //                 if (oMatchedCoupon.UptoValue > 0 &&  oCustomerData.Discount > oMatchedCoupon.UptoValue) {
                //                            oCustomerData.Discount = Number(oMatchedCoupon.UptoValue);
                //                              }
                //          } else {
                //             oCustomerData.Discount = this.CouponDiscount || oCustomerData.Discount || "0.00";
                //         }

                //     } else {
                //         oCustomerData.Discount = "0.00";
                //         this.getView().getModel("VisibleModel").setProperty("/IsCouponApplied", false);
                //         this.getView().getModel("Bookingmodel").setProperty("/CouponCode", "");
                //         var oInput = this.getView().byId("couponInput");
                //         this.Code = ""
                //         oInput.setValue("");
                //         oInput.setShowValueHelp(false);
                //     }
                // }

                // oCustomerData.RentPrice = oCustomerData.RentPrice || 0;
                // oCustomerData.SubTotal = (total + (oCustomerData.RentPrice || 0) - Number(oCustomerData.Discount));

                // if(oCustomerData.GSTType==="IGST"){
                // oCustomerData.IGST = oCustomerData.SubTotal * oCustomerData.GSTValue /100;
                // oCustomerData.GrandTotal = oCustomerData.SubTotal + oCustomerData.IGST;

                // }else{
                // oCustomerData.SGST = oCustomerData.SubTotal * oCustomerData.GSTValue /100 ;
                // oCustomerData.CGST = oCustomerData.SubTotal * oCustomerData.GSTValue /100 ;
                // oCustomerData.GrandTotal = oCustomerData.SubTotal + oCustomerData.SGST + oCustomerData.CGST;

                // }

                // oCustomerData.DueAmount = oCustomerData.GrandTotal - oCustomerData.PaymentPaid;

                oCustomerData.RentPrice = oCustomerData.RentPrice || 0;
                oCustomerData.SubTotal = (total + (oCustomerData.RentPrice || 0));

                if (oCustomerData.GSTType === "IGST") {
                    oCustomerData.IGST = oCustomerData.SubTotal * oCustomerData.GSTValue / 100;
                    oCustomerData.GrandTotal = oCustomerData.SubTotal + oCustomerData.IGST - Number(oCustomerData.Discount);

                } else {
                    oCustomerData.SGST = oCustomerData.SubTotal * oCustomerData.GSTValue / 100;
                    oCustomerData.CGST = oCustomerData.SubTotal * oCustomerData.GSTValue / 100;
                    oCustomerData.GrandTotal = oCustomerData.SubTotal + oCustomerData.SGST + oCustomerData.CGST - Number(oCustomerData.Discount);

                }

                oCustomerData.DueAmount = oCustomerData.GrandTotal - oCustomerData.PaymentPaid;

                // Update model
                oCustomerModel.setData(oCustomerData);
                oCustomerModel.refresh(true);

                this.HM_Dialog.close();
                sap.m.MessageToast.show(this.i18nModel.getText("facilityUpdatedSuccessfully"));

                this._editIndex = undefined;

            } else {
                sap.m.MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"))
            }
        },

       onEditBooking: async function () {

    this.applyCountryStateCityFilters();

    const oMobile = this.byId("CD_ID_idPhone");
    const oView = this.getView();

    const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
    const oUser = oLoginModel ? oLoginModel.getData() : null;

    // ❗ User NOT logged in
     if (!(oUser?.UserID || oUser?.EmployeeID)) {

        // remember action to resume after login
        this._pendingAction = "EditBooking";

        if (!this._oLoginAlertDialog) {
            this._oLoginAlertDialog = sap.ui.xmlfragment(
                this.createId("LoginAlertDialog"),
                "sap.ui.com.project1.fragment.SignInSignup",
                this
            );
            oView.addDependent(this._oLoginAlertDialog);
        }

        this._oLoginAlertDialog.open();
        return;
    }

    // ------------------------------
    // USER IS LOGGED IN → CONTINUE
    // ------------------------------

    this.getBusyDialog();

    const response = await this.ajaxReadWithJQuery("HM_Customer", "");
    this.closeBusyDialog();

    const oCustomer = response?.Customers || response?.value?.[0] || [];

    this.getView().getModel("VisibleModel").setProperty("/visible", true);

    var data = this.getView().getModel("CustomerData").getData();
    var model = this.getView().getModel("Bookingmodel");
    var aAvailableBeds = this.getView().getModel("Availablebeds").getData();

    if (data.STDCode === "+91") {
        oMobile.setMaxLength(10);
    } else {
        oMobile.setMaxLength(18);
    }

    var filteredBeds = aAvailableBeds.filter(function (bed) {

        var assignedCount = oCustomer.filter(function (cust) {
            return cust.BranchCode === bed.BranchCode &&
                cust.BedType === bed.BedTypeName &&
                cust.Status === "Assigned";
        }).length;

        var customerHasThisBed = oCustomer.some(function (cust) {
            return cust.CustomerID === data.CustomerID &&
                cust.BedType === bed.BedTypeName &&
                (cust.Status === "Assigned" || cust.Status === "New");
        });

        if (assignedCount >= Number(bed.NoofPerson) && !customerHasThisBed) {
            return false;
        }

        return true;
    });

    this.getView().getModel("Availablebeds").setData(filteredBeds);

    if (data.CouponCode) {
        this.Coupon();
    } else {
        this.getView().byId("couponInput").setShowValueHelp(false);
    }

    model.setProperty("/BedTypeName", data.BedType);
    model.setProperty("/CouponCode", data.CouponCode);
    model.setProperty("/UnitText", data.PaymentType);
    model.setProperty("/StartDate", data.StartDate);
    model.setProperty("/EndDate", data.EndDate);
    model.setProperty("/CustomerName", data.CustomerName);
    model.setProperty("/DateOfBirth", data.DateOfBirth);
    model.setProperty("/Gender", data.Gender);
    model.setProperty("/CustomerEmail", data.CustomerEmail);
    model.setProperty("/Country", data.Country);
    model.setProperty("/State", data.State);
    model.setProperty("/City", data.City);
    model.setProperty("/STDCode", data.STDCode);
    model.setProperty("/MobileNo", data.MobileNo);
    model.setProperty("/Salutation", data.Salutation);
    model.setProperty("/Address", data.Address);

    if (data.PaymentType === "Per Month") {
        model.setProperty("/UnitText", "monthly");
    } else if (data.PaymentType === "Per Day") {
        model.setProperty("/UnitText", "daily");
    } else if (data.PaymentType === "Per Year") {
        model.setProperty("/UnitText", "yearly");
    }

    if (data.PaymentType !== "daily" || data.PaymentType !== "Per Day") {
        this.byId("idMonthYearSelect").setVisible(false);
    }

    if (data.PaymentType === "monthly" || data.PaymentType === "Per Month") {
        model.setProperty("/DurationUnit", data.Duration);
        this.byId("idMonthYearSelect").setVisible(true);
    } 
    else if (data.PaymentType === "yearly" || data.PaymentType === "Per Year") {
        model.setProperty("/DurationUnit", data.Duration);
        this.byId("idMonthYearSelect").setVisible(true);
    }

    this.getView().getModel("VisibleModel").setProperty("/IsCouponApplied", false);
},

        onBookingEditDateChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            var oBookingModel = this.getView().getModel("Bookingmodel");
            var oCustomerModel = this.getView().getModel("CustomerData");
            var oData = oBookingModel.getData();

            var sStart = oData.StartDate;
            var sEnd = oData.EndDate;
            var sUnit = oData.UnitText; // daily / monthly / yearly

            // Get selected duration from <Select>
            var duration = oData.DurationUnit ? parseInt(oData.DurationUnit) : 1;

            // Rent handling
            let originalRent = oCustomerModel.getProperty("/OrginalRentPrice");
            if (!originalRent) {
                originalRent = oCustomerModel.getProperty("/OrginalRentPrice") || 0;
                oCustomerModel.setProperty("/OriginalRentPrice", originalRent);
            }

            if (!sStart || !sUnit) {
                return;
            }

            // Convert dates if dd/mm/yyyy
            if (sStart.includes("/")) {
                sStart = sStart.split("/").reverse().join("-");
            }
            if (sEnd && sEnd.includes("/")) {
                sEnd = sEnd.split("/").reverse().join("-");
            }

            var oStart = new Date(sStart);
            var oEnd = sEnd ? new Date(sEnd) : null;

            // Set MinDate on EndDate picker
            var oEndDatePicker = this.byId("editEndDate");
            if (oEndDatePicker) {
                var oDate = new Date(sStart);
                oDate.setDate(oDate.getDate() + 1);
                oEndDatePicker.setMinDate(oDate);
            }
            var CustData = oCustomerModel.getData();
            // DAILY CALCULATION
            if (sUnit === "daily" || sUnit === "Per Day") {

                if (!oEnd) {
                    sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectEndDateforDailyCalculation"));
                    return;
                }

                // Validate EndDate >= StartDate
                if (oEnd <= oStart) {
                    // Clear EndDate
                    oBookingModel.setProperty("/EndDate", "");
                    if (oEndDatePicker) oEndDatePicker.setValue("");

                    sap.m.MessageToast.show(this.i18nModel.getText("endDatecannotbeearlierthanStartDate"));
                    return;
                }

                // Calculate day difference
                var diffTime = oEnd - oStart;
                var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

                oCustomerModel.setProperty("/RentPrice", diffDays * originalRent);
                oCustomerModel.setProperty("/Duration", diffDays);


                var fFacilityPrice = oCustomerModel.getProperty("/TotalFacilityPrice") || 0
                // if (CustData.CouponCode || this.Code) {
                //     var oCouponData = this.getView().getModel("CouponModel").getData();
                //     var sEnteredCode = this.Code || CustData.CouponCode; // user entered code
                //     var oMatchedCoupon = oCouponData.find(coupon => coupon.CouponCode === sEnteredCode);

                //     if (oMatchedCoupon.MinOrderValue <= (fFacilityPrice + (CustData.RentPrice || 0))) {

                //         if (oMatchedCoupon.DiscountType === "Percentage" && this.CouponDiscount || oMatchedCoupon.DiscountType === "Percentage" && CustData.Discount) {
                //             this.CouponDiscount = this.CouponDiscount || oMatchedCoupon.DiscountValue || "0"
                //             CustData.Discount = (fFacilityPrice + (CustData.RentPrice || 0)) * Number(this.CouponDiscount) / 100
                //             if (oMatchedCoupon.UptoValue > 0 && CustData.Discount > oMatchedCoupon.UptoValue) {
                //                 CustData.Discount = Number(oMatchedCoupon.UptoValue);
                //             }
                //         } else {
                //             CustData.Discount = this.CouponDiscount || CustData.Discount || "0.00";
                //         }

                //     }
                // }
                // var SubTotal = diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice")) - Number(CustData.Discount)

                // var SubTotal = SubTotal
                //   var CGST = SubTotal * CustData.GSTValue / 100
                // if(CustData.GSTType==="IGST"){
                // oCustomerModel.setProperty("/IGST", CGST)
                //    oCustomerModel.setProperty("/GrandTotal", SubTotal + CGST);
                // oCustomerModel.setProperty("/DueAmount", SubTotal + CGST - CustData.PaymentPaid);

                // }else{
                // oCustomerModel.setProperty("/SGST", CGST)
                // oCustomerModel.setProperty("/CGST", CGST)
                //    oCustomerModel.setProperty("/GrandTotal", SubTotal + CGST + CGST);
                // oCustomerModel.setProperty("/DueAmount", SubTotal + CGST + CGST - CustData.PaymentPaid);
                // }


                // oCustomerModel.setProperty("/SubTotal", SubTotal);
                // oCustomerModel.setProperty("/Discount", CustData.Discount)
                var SubTotal = diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice"))

                var SubTotal = SubTotal
                var CGST = SubTotal * CustData.GSTValue / 100
                let TotalAmount;

                if (CustData.GSTType === "IGST") {
                    TotalAmount = SubTotal + CGST;
                } else if (CustData.GSTType === "CGST/SGST") {
                    TotalAmount = SubTotal + CGST + CGST;
                } else {
                    TotalAmount = SubTotal
                }
                // if (CustData.CouponCode || this.Code) {
                //     var oCouponData = this.getView().getModel("CouponModel").getData();
                //     var sEnteredCode = this.Code || CustData.CouponCode; // user entered code
                //     var oMatchedCoupon = oCouponData.find(coupon => coupon.CouponCode === sEnteredCode);



                //     if (oMatchedCoupon.MinOrderValue <= TotalAmount) {

                //         if (oMatchedCoupon.DiscountType === "Percentage" && this.CouponDiscount || oMatchedCoupon.DiscountType === "Percentage" && CustData.Discount) {
                //             this.CouponDiscount = this.CouponDiscount || oMatchedCoupon.DiscountValue || "0"
                //             CustData.Discount = TotalAmount * Number(this.CouponDiscount) / 100
                //             if (oMatchedCoupon.UptoValue > 0 && CustData.Discount > oMatchedCoupon.UptoValue) {
                //                 CustData.Discount = Number(oMatchedCoupon.UptoValue);
                //             }
                //         } else {
                //             CustData.Discount = this.CouponDiscount || CustData.Discount || "0.00";
                //         }

                //     }
                // }

                if (CustData.GSTType === "IGST") {
                    oCustomerModel.setProperty("/IGST", CGST)


                } else {
                    oCustomerModel.setProperty("/SGST", CGST)
                    oCustomerModel.setProperty("/CGST", CGST)

                }

                oCustomerModel.setProperty("/GrandTotal", TotalAmount - Number(CustData.Discount));
                oCustomerModel.setProperty("/DueAmount", TotalAmount - Number(CustData.Discount) - CustData.PaymentPaid);
                oCustomerModel.setProperty("/SubTotal", SubTotal);
                oCustomerModel.setProperty("/Discount", CustData.Discount)

                oData.EndDate = this._formatDate(oEnd);
                oBookingModel.refresh();
                return;
            }

            // MONTHLY CALCULATION
            if (sUnit === "monthly" || sUnit === "Per Month") {
                // Reset EndDate to StartDate always
                oEnd = new Date(oStart);

                // Add selected duration months
                oEnd.setMonth(oEnd.getMonth() + duration);
                oEnd.setDate(oEnd.getDate() - 1);
                var diffDays = oBookingModel.getProperty("/DurationUnit");
                oCustomerModel.setProperty("/RentPrice", diffDays * originalRent);

                var SubTotal = (diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice")))

                var CGST = SubTotal * CustData.GSTValue / 100
                let TotalAmount;

                if (CustData.GSTType === "IGST") {
                    TotalAmount = SubTotal + CGST;
                } else if (CustData.GSTType === "CGST/SGST") {
                    TotalAmount = SubTotal + CGST + CGST;
                } else {
                    TotalAmount = SubTotal
                }

                if (CustData.GSTType === "IGST") {
                    oCustomerModel.setProperty("/IGST", CGST)


                } else {
                    oCustomerModel.setProperty("/SGST", CGST)
                    oCustomerModel.setProperty("/CGST", CGST)

                }

                oCustomerModel.setProperty("/GrandTotal", TotalAmount - Number(CustData.Discount));
                oCustomerModel.setProperty("/DueAmount", TotalAmount - Number(CustData.Discount) - CustData.PaymentPaid);
                oCustomerModel.setProperty("/SubTotal", SubTotal);
                oCustomerModel.setProperty("/Discount", CustData.Discount)

            }

            // YEARLY CALCULATION
            if (sUnit === "yearly" || sUnit === "Per Year") {

                // Reset EndDate to StartDate always
                oEnd = new Date(oStart);

                // Add selected duration years
                oEnd.setFullYear(oEnd.getFullYear() + duration);
                oEnd.setDate(oEnd.getDate() - 1);
                var diffDays = oBookingModel.getProperty("/DurationUnit");
                oCustomerModel.setProperty("/RentPrice", diffDays * originalRent);

                var SubTotal = (diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice")))

                var CGST = SubTotal * CustData.GSTValue / 100
                let TotalAmount;

                if (CustData.GSTType === "IGST") {
                    TotalAmount = SubTotal + CGST;
                } else if (CustData.GSTType === "CGST/SGST") {
                    TotalAmount = SubTotal + CGST + CGST;
                } else {
                    TotalAmount = SubTotal
                }

                if (CustData.GSTType === "IGST") {
                    oCustomerModel.setProperty("/IGST", CGST)


                } else {
                    oCustomerModel.setProperty("/SGST", CGST)
                    oCustomerModel.setProperty("/CGST", CGST)

                }

                oCustomerModel.setProperty("/GrandTotal", TotalAmount - Number(CustData.Discount));
                oCustomerModel.setProperty("/DueAmount", TotalAmount - Number(CustData.Discount) - CustData.PaymentPaid);
                oCustomerModel.setProperty("/SubTotal", SubTotal);
                oCustomerModel.setProperty("/Discount", CustData.Discount)
            }

            // Save final EndDate in yyyy-MM-dd
            oData.EndDate = this._formatDate(oEnd);

            oBookingModel.refresh();
        },

        _formatDate: function (oDate) {
            var yyyy = oDate.getFullYear();
            var mm = String(oDate.getMonth() + 1).padStart(2, '0');
            var dd = String(oDate.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        },

        onBookMonthYearChange: function (oEvent) {
            const oModel = this.getView().getModel("Bookingmodel");
            const oCustomerData = this.getView().getModel("CustomerData");
            var CustData = this.getView().getModel("CustomerData").getData()
            // Store original RentPrice once if not already stored
            let originalRent = oCustomerData.getProperty("/OriginalRentPrice");
            if (!originalRent) {
                originalRent = oCustomerData.getProperty("/OrginalRentPrice") || 0;
                oCustomerData.setProperty("/OriginalRentPrice1", originalRent);
            }

            const iCount = Number(oEvent.getSource().getSelectedKey()) || 1;
            const sUnit = oModel.getProperty("/UnitText");
            let sStartDate = oModel.getProperty("/StartDate"); // e.g., "24/11/2025"

            if (!sStartDate) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectStartDateFirst"));
                return;
            }

            if (sStartDate.includes("/")) {
                sStartDate = sStartDate
                    .split("/")
                    .reverse()
                    .join("-");
            }

            const oStart = new Date(sStartDate);
            let oEnd = new Date(oStart);

            if (sUnit === "monthly" || sUnit === "Per Month") {
                oEnd.setMonth(oEnd.getMonth() + iCount);  // add iCount months
                oEnd.setDate(oEnd.getDate() - 1);
                oCustomerData.setProperty("/RentPrice", iCount * originalRent); // use originalRent
            } else if (sUnit === "yearly" || sUnit === "Per Year") {
                oEnd.setFullYear(oEnd.getFullYear() + iCount); // add iCount years
                oEnd.setDate(oEnd.getDate() - 1)
                oCustomerData.setProperty("/RentPrice", iCount * originalRent); // use originalRent
            }

            // Format yyyy-MM-dd for DatePicker
            const sFormatted = oEnd.toISOString().split("T")[0];
            oModel.setProperty("/EndDate", sFormatted);
            var fPrice = oCustomerData.getProperty("/RentPrice")

            var fFacilityPrice = parseFloat(oCustomerData.getProperty("/TotalFacilityPrice") || 0);



            // if (CustData.CouponCode || this.Code) {
            //     var oCouponData = this.getView().getModel("CouponModel").getData();
            //     var sEnteredCode = this.Code || CustData.CouponCode; // user entered code
            //     var oMatchedCoupon = oCouponData.find(coupon => coupon.CouponCode === sEnteredCode);

            //     if (oMatchedCoupon.MinOrderValue <= (fFacilityPrice + (CustData.RentPrice || 0))) {

            //         if (oMatchedCoupon.DiscountType === "Percentage" && this.CouponDiscount || oMatchedCoupon.DiscountType === "Percentage" && CustData.Discount) {
            //             this.CouponDiscount = this.CouponDiscount || oMatchedCoupon.DiscountValue || "0"
            //             CustData.Discount = (fFacilityPrice + (CustData.RentPrice || 0)) * Number(this.CouponDiscount) / 100
            //             if (oMatchedCoupon.UptoValue > 0 && CustData.Discount > oMatchedCoupon.UptoValue) {
            //                 CustData.Discount = Number(oMatchedCoupon.UptoValue);
            //             }
            //         } else {
            //             CustData.Discount = this.CouponDiscount || CustData.Discount || "0.00";
            //         }

            //     }
            // }
            // var SubTotal = (fPrice + fFacilityPrice) - Number(CustData.Discount)
            //   var CGST = SubTotal * CustData.GSTValue / 100
            //     if(CustData.GSTType==="IGST"){
            //     oCustomerData.setProperty("/IGST", CGST)
            //           oCustomerData.setProperty("/GrandTotal", SubTotal + CGST);
            // oCustomerData.setProperty("/DueAmount", SubTotal + CGST - CustData.PaymentPaid);

            //     }else{
            //     oCustomerData.setProperty("/SGST", CGST)
            //     oCustomerData.setProperty("/CGST", CGST)
            //        oCustomerData.setProperty("/GrandTotal", SubTotal + CGST + CGST);
            //      oCustomerData.setProperty("/DueAmount", SubTotal + CGST + CGST - CustData.PaymentPaid);
            //     }


            // oCustomerData.setProperty("/SubTotal", SubTotal);
            // oCustomerData.setProperty("/Discount", CustData.Discount)
            var SubTotal = (fPrice + fFacilityPrice)
            var CGST = SubTotal * CustData.GSTValue / 100

            let TotalAmount;

            if (CustData.GSTType === "IGST") {
                TotalAmount = SubTotal + CGST;
            } else if (CustData.GSTType === "CGST/SGST") {
                TotalAmount = SubTotal + CGST + CGST;
            } else {
                TotalAmount = SubTotal
            }
            // if (CustData.CouponCode || this.Code) {
            //     var oCouponData = this.getView().getModel("CouponModel").getData();
            //     var sEnteredCode = this.Code || CustData.CouponCode; // user entered code
            //     var oMatchedCoupon = oCouponData.find(coupon => coupon.CouponCode === sEnteredCode);


            //     if (oMatchedCoupon.MinOrderValue <= TotalAmount) {



            //         if (oMatchedCoupon.DiscountType === "Percentage" && this.CouponDiscount || oMatchedCoupon.DiscountType === "Percentage" && CustData.Discount) {
            //             this.CouponDiscount = this.CouponDiscount || oMatchedCoupon.DiscountValue || "0"
            //             CustData.Discount = TotalAmount * Number(this.CouponDiscount) / 100
            //             if (oMatchedCoupon.UptoValue > 0 && CustData.Discount > oMatchedCoupon.UptoValue) {
            //                 CustData.Discount = Number(oMatchedCoupon.UptoValue);
            //             }
            //         } else {
            //             CustData.Discount = this.CouponDiscount || CustData.Discount || "0.00";
            //         }

            //     }
            // }

            if (CustData.GSTType === "IGST") {
                oCustomerData.setProperty("/IGST", CGST)


            } else {
                oCustomerData.setProperty("/SGST", CGST)
                oCustomerData.setProperty("/CGST", CGST)

            }

            oCustomerData.setProperty("/GrandTotal", TotalAmount - Number(CustData.Discount));
            oCustomerData.setProperty("/DueAmount", TotalAmount - Number(CustData.Discount) - CustData.PaymentPaid);
            oCustomerData.setProperty("/SubTotal", SubTotal);
            oCustomerData.setProperty("/Discount", CustData.Discount)
            oCustomerData.setProperty("/Duration", iCount)



        },

        onCancelBooking: function () {
            this.valuestate()
            this.getView().getModel("VisibleModel").setProperty("/visible", false)
            this.byId("idMonthYearSelect").setVisible(false)
            var oCustomerData = this.getView().getModel("CustomerData").getData()

            var originalRent = Number(oCustomerData.RentPrice || 0);
            var FacilitiPrice = Number(oCustomerData.TotalFacilityPrice || 0);
            var previousDiscount = Number(this.originalDis ?? oCustomerData.Discount);
            ;
            // Recalculate subtotal (original subtotal before coupon)
            var subtotal = originalRent + FacilitiPrice - previousDiscount; // Assuming SubTotal originally was just RentPrice
            oCustomerData.SubTotal = subtotal;

            // Recalculate taxes
            var cgst = subtotal * 0.09;
            var sgst = subtotal * 0.09;
            var grandTotal = subtotal + cgst + sgst;

            // Update model values
            oCustomerData.Discount = previousDiscount;
            oCustomerData.CGST = cgst;
            oCustomerData.SGST = sgst;
            oCustomerData.GrandTotal = grandTotal;

            // Refresh model and reset coupon flag
            this.AD_onSearch()
            this.getView().getModel("CustomerData").refresh(true);
        },

        onEditFacilityDetails: function () {
            var data = this.getView().getModel("Bookingmodel").getData()
            var oTable = this.byId("Ad_id_idFacilityRoomTableDetails");
            var oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectFacilitytoEdit"));
                return;
            }


            var oContext = oSelectedItem.getBindingContext("CustomerData");
            var oSelectedData = oContext.getObject();

            var editCouponCode = sap.ui.getCore().byId("ID_editCouponCode");

            if (editCouponCode) {
                editCouponCode.setShowValueHelp(!!oSelectedData.CouponCode);
            }


            var sStartDate = oSelectedData.StartDate.split("/").reverse().join("-"); // e.g. "2025-01-15"
            var sEndDate = oSelectedData.EndDate.split("/").reverse().join("-");   // e.g. "2025-06-14"

            if (sStartDate && sEndDate) {
                var oStart = new Date(sStartDate);
                var oEnd = new Date(sEndDate);


                if (oSelectedData.UnitText === "Per Month") {
                    var iMonths =
                        (oEnd.getFullYear() - oStart.getFullYear()) * 12 +
                        (oEnd.getMonth() - oStart.getMonth());

                    // Optional: include partial month logic
                    if (oEnd.getDate() >= oStart.getDate()) {
                        iMonths += 1;
                    }
                } else if (oSelectedData.UnitText === "Per Year") {
                    var iMonths =
                        (oEnd.getFullYear() - oStart.getFullYear());


                }

            }

            // 👉 STORE INDEX for update later
            this._editIndex = Number(oContext.getPath().split("/").pop());

            // Load data into edit model
            this.getView().getModel("edit").setData(Object.assign({}, oSelectedData));
            this.getView().getModel("edit").setProperty("/TotalUnits", iMonths)
            this.iCount = iMonths
            // Open dialog
            if (!this.HM_Dialog) {
                var oView = this.getView();
                this.HM_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Admin_Edit", this);
                oView.addDependent(this.HM_Dialog);
            }
            sap.ui.getCore().byId("idUnitType").setVisible(true)
            this.HM_Dialog.open();
            this.getView().getModel("CustomerData").setProperty("/minStartDate", new Date(data.StartDate.split("/").reverse().join("-")));
            this.getView().getModel("CustomerData").setProperty("/minEndDate", new Date(data.EndDate.split("/").reverse().join("-")));

            var sSelectedFacility = oSelectedData.FacilityName;

            // 2. Get Facilities Model
            var oFacilitiesModel = this.getView().getModel("Facilities");
            var aFacilities = oFacilitiesModel.getData();

            // 3. Get RateType Model
            // 4. Get selected facility data
            var oSelectedFacility = aFacilities.find(f => f.FacilityName === sSelectedFacility);
            if (!oSelectedFacility) return;
            // 5. Get booking unitText
            var oBookingModel = this.getView().getModel("Bookingmodel");
            var sUnitText = oBookingModel.getProperty("/UnitText");// assuming the field is unitText
            var OrginalRentPrice = this.getView().getModel("CustomerData").getProperty("/OrginalRentPrice")

            if (OrginalRentPrice === "0.00") {
                sap.m.MessageToast.show(this.i18nModel.getText("diffBooking"));
                this.HM_Dialog.close();
                return;
            }

            // 6. Define allowed rate types based on booking unitText
            var aAllowedRateTypes = [];
            if (sUnitText === "Per Month" || sUnitText === "monthly") {
                aAllowedRateTypes = ["Per Month", "Per Day", "Per Hour"];
            } else if (sUnitText === "Per Day" || sUnitText === "daily") {
                aAllowedRateTypes = ["Per Day", "Per Hour"];
            } else if (sUnitText === "Per Hour") {
                aAllowedRateTypes = ["Per Hour"];
            } else {
                aAllowedRateTypes = ["Per Day", "Per Month", "Per Year", "Per Hour"];
            }
            var _aOriginalRateTypes = [
                { "RateType": "Per Day" },
                { "RateType": "Per Hour" },
                { "RateType": "Per Month" },
                { "RateType": "Per Year" }
            ]
            // 7. Filter RateType based on facility price AND booking unitText
            var aFilteredRateTypes = _aOriginalRateTypes.filter(rt => {
                if (!aAllowedRateTypes.includes(rt.RateType)) {
                    return false;
                }
                if (rt.RateType === "Per Day") return Number(oSelectedFacility.PerDayPrice) !== 0;
                if (rt.RateType === "Per Month") return Number(oSelectedFacility.PerMonthPrice) !== 0;
                if (rt.RateType === "Per Year") return Number(oSelectedFacility.PerYearPrice) !== 0;
                if (rt.RateType === "Per Hour") return Number(oSelectedFacility.PerHourPrice) !== 0;
                return true;
            });
            var oRateTypeModel = this.getView().getModel("RateType");

            // 8. Set filtered data back to RateType model
            oRateTypeModel.setData(aFilteredRateTypes);

            sap.ui.getCore().byId("idUnitType").setValueState("None")
            sap.ui.getCore().byId("editStartTime").setValueState("None")
            sap.ui.getCore().byId("editEndTime").setValueState("None")
            sap.ui.getCore().byId("editHours").setValueState("None")
            sap.ui.getCore().byId("editFacilityName").setValueState("None")
            sap.ui.getCore().byId("editStartDate").setValueState("None")
            sap.ui.getCore().byId("editEndDate").setValueState("None")
        },

        onDeleteFacilityDetails: function () {
            var oTable = this.byId("Ad_id_idFacilityRoomTableDetails");
            var oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectFacilitytoDelete"));
                return;
            }

            var oCustomerModel = this.getView().getModel("CustomerData");
            var oCustomerData = oCustomerModel.getData();

            var oContext = oSelectedItem.getBindingContext("CustomerData");
            var oSelectedData = oContext.getObject();

            var sFacilityID = oSelectedData.FacilityID;
            var aFacilities = oCustomerData.AllSelectedFacilities;

            // Determine delete index
            var deleteIndex = -1;

            if (sFacilityID) {
                deleteIndex = aFacilities.findIndex(f => f.FacilityID === sFacilityID);
            }

            // fallback by index if FacilityID not found
            if (deleteIndex === -1) {
                deleteIndex = parseInt(oContext.getPath().split("/").pop());
            }

            var that = this;

            if (sFacilityID) {
                sap.m.MessageBox.confirm(
                    "Are you sure you want to Delete this Facility?", {
                    title: "Confirm Delete",
                    actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.OK) {

                            // Backend call
                            that.ajaxDeleteWithJQuery("HM_BookingFacilityItems", {
                                filters: {
                                    FacilityID: sFacilityID
                                }
                            })
                                .then(function () {
                                    // Remove from model
                                    if (deleteIndex > -1) {
                                        aFacilities.splice(deleteIndex, 1);
                                    }

                                    that._recalculateFacilityTotals(oCustomerData);

                                    // Force UI update
                                    oCustomerModel.refresh(true);
                                    oTable.removeSelections(true);

                                    sap.m.MessageToast.show(this.i18nModel.getText("facilityDeletedSuccessfully"));
                                })
                                .catch(function () {
                                    sap.m.MessageToast.show(this.i18nModel.getText("failedtoDeleteFacilityfromServer"));
                                });

                        }
                    }
                }
                );

                return;
            }

            if (deleteIndex > -1) {
                aFacilities.splice(deleteIndex, 1);
            }

            this._recalculateFacilityTotals(oCustomerData);

            oCustomerModel.refresh(true);
            oTable.removeSelections(true);

            sap.m.MessageToast.show(this.i18nModel.getText("facilityRemovedSuccessfully"));
        },

        // Helper: Total Calculation
        _recalculateFacilityTotals: function (oCustomerData) {
            var total = 0;
            (oCustomerData.AllSelectedFacilities || []).forEach(function (fac) {
                total += Number(fac.TotalAmount) || 0;
            });
            oCustomerData.TotalFacilityPrice = total;

            // if (oCustomerData.CouponCode || this.Code) {
            //     var oCouponData = this.getView().getModel("CouponModel").getData().
            //         find((item) => item.CouponCode === this.Code || oCustomerData.CouponCode)
            //         || {};

            //     if (oCouponData.DiscountType === "Percentage") {
            //            this.CouponDiscount = this.CouponDiscount || oCouponData.DiscountValue || "0"
            //         oCustomerData.Discount = (total + (oCustomerData.RentPrice || 0)) * Number(this.CouponDiscount) / 100
            //              if (oCouponData.UptoValue > 0 &&  oCustomerData.Discount > oCouponData.UptoValue) {
            //            oCustomerData.Discount = Number(oCouponData.UptoValue);
            //         }
            //     } else {
            //         oCustomerData.Discount = Number(oCouponData.DiscountValue)
            //     }
            //     if (total + (oCustomerData.RentPrice || 0) < Number(oCouponData.MinOrderValue)) {
            //         oCustomerData.Discount = "0.00";
            //         this.getView().getModel("VisibleModel").setProperty("/IsCouponApplied", false);
            //         this.getView().getModel("Bookingmodel").setProperty("/CouponCode", "");
            //         var oInput = this.getView().byId("couponInput");
            //         this.Code = ""
            //         oInput.setValue("");
            //         oInput.setShowValueHelp(false);
            //     }
            // }

            // oCustomerData.SubTotal = (total + (oCustomerData.RentPrice || 0) - Number(oCustomerData.Discount));
            // if(oCustomerData.GSTType==="IGST"){
            // oCustomerData.IGST = oCustomerData.SubTotal * oCustomerData.GSTValue/100;
            // oCustomerData.GrandTotal = oCustomerData.SubTotal + oCustomerData.IGST;
            // } else {
            // oCustomerData.SGST = oCustomerData.SubTotal * oCustomerData.GSTValue/100;
            // oCustomerData.CGST = oCustomerData.SubTotal * oCustomerData.GSTValue/100;
            // oCustomerData.GrandTotal = oCustomerData.SubTotal + oCustomerData.SGST + oCustomerData.CGST;
            // }
            // oCustomerData.DueAmount = oCustomerData.GrandTotal - oCustomerData.PaymentPaid

            oCustomerData.SubTotal = (total + (oCustomerData.RentPrice || 0));
            if (oCustomerData.GSTType === "IGST") {
                oCustomerData.IGST = oCustomerData.SubTotal * oCustomerData.GSTValue / 100;
                oCustomerData.GrandTotal = oCustomerData.SubTotal + oCustomerData.IGST - Number(oCustomerData.Discount);
            } else {
                oCustomerData.SGST = oCustomerData.SubTotal * oCustomerData.GSTValue / 100;
                oCustomerData.CGST = oCustomerData.SubTotal * oCustomerData.GSTValue / 100;
                oCustomerData.GrandTotal = oCustomerData.SubTotal + oCustomerData.SGST + oCustomerData.CGST - Number(oCustomerData.Discount);
            }
            oCustomerData.DueAmount = oCustomerData.GrandTotal - oCustomerData.PaymentPaid

            // oCustomerData.GrandTotal = total + (oCustomerData.RentPrice || 0);
        },

        onRoomDurationChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            var oSelectedItem = oEvent.getParameter("selectedItem");

            // If user cleared selection or typed manually
            if (!oSelectedItem) {
                var oCustomerModel = this.getView().getModel("CustomerData");
                var oBookingModel = this.getView().getModel("Bookingmodel");

                // Reset values
                oCustomerModel.setProperty("/PaymentType", "");
                oCustomerModel.setProperty("/RentPrice", 0);
                oCustomerModel.setProperty("/OrginalRentPrice", 0);
                oCustomerModel.setProperty("/GrandTotal", 0);

                oBookingModel.setProperty("/DurationUnit", "");
                oBookingModel.setProperty("/StartDate", "");
                oBookingModel.setProperty("/EndDate", "");

                return; // stop execution here
            }

            var sUnit = oEvent.getParameter("selectedItem").getKey(); // daily / monthly / yearly
            var oBookingModel = this.getView().getModel("Bookingmodel");
            var oCustomerModel = this.getView().getModel("CustomerData");
            var sBedType = oBookingModel.getProperty("/BedTypeName"); // currently selected bed type
            var aAvailableBeds = this.getView().getModel("Availablebeds").getData(); // all available beds
            oCustomerModel.setProperty("/PaymentType", sUnit);
            this.byId("idPaymentMethod1").setSelectedKey(sUnit);

            // Find the bed object
            var oSelectedBed = aAvailableBeds.find(bed => bed.BedTypeName === sBedType);
            if (oSelectedBed) {
                // Get the correct price based on duration
                var fPrice = 0;
                if (sUnit === "daily" || sUnit === "Per Day") {
                    fPrice = parseFloat(oSelectedBed.Price || 0)
                    oBookingModel.setProperty("/StartDate", "")
                    oBookingModel.setProperty("/EndDate", "")

                } else if (sUnit === "monthly" || sUnit === "Per Month") {
                    fPrice = parseFloat(oSelectedBed.MonthPrice || 0)
                    oBookingModel.setProperty("/StartDate", "")
                    oBookingModel.setProperty("/EndDate", "")
                    oBookingModel.setProperty("/DurationUnit", "1")
                } else if (sUnit === "yearly" || sUnit === "Per Year") {
                    fPrice = parseFloat(oSelectedBed.YearPrice || 0)
                    oBookingModel.setProperty("/StartDate", "")
                    oBookingModel.setProperty("/EndDate", "")
                    oBookingModel.setProperty("/DurationUnit", "1")
                };

                // Update RentPrice
                oCustomerModel.setProperty("/RentPrice", fPrice);
                oCustomerModel.setProperty("/OrginalRentPrice", fPrice);
                // Update GrandTotal
                var fFacilityPrice = parseFloat(oCustomerModel.getProperty("/TotalFacilityPrice") || 0);

                var CustData = this.getView().getModel("CustomerData").getData()
                // if (CustData.CouponCode || this.Code) {
                //     var oCouponData = this.getView().getModel("CouponModel").getData();
                //     var sEnteredCode = this.Code || CustData.CouponCode; // user entered code
                //     var oMatchedCoupon = oCouponData.find(coupon => coupon.CouponCode === sEnteredCode);

                //     if (oMatchedCoupon.MinOrderValue <= (fFacilityPrice + (CustData.RentPrice || 0))) {

                //         if (oMatchedCoupon.DiscountType === "Percentage" && this.CouponDiscount || oMatchedCoupon.DiscountType === "Percentage" && CustData.Discount) {
                //             this.CouponDiscount = this.CouponDiscount || oMatchedCoupon.DiscountValue || "0"
                //             CustData.Discount = (fFacilityPrice + (CustData.RentPrice || 0)) * Number(this.CouponDiscount) / 100
                //             if (oMatchedCoupon.UptoValue > 0 && CustData.Discount > oMatchedCoupon.UptoValue) {
                //                 CustData.Discount = Number(oMatchedCoupon.UptoValue);
                //             }
                //         } else {
                //             CustData.Discount = this.CouponDiscount || CustData.Discount || "0.00";
                //         }

                //     }
                // }
                // var SubTotal = fPrice + fFacilityPrice - Number(CustData.Discount)
                //   var CGST = SubTotal * CustData.GSTValue / 100
                // if(CustData.GSTType==="IGST"){
                // oCustomerModel.setProperty("/IGST", CGST)
                //     oCustomerModel.setProperty("/GrandTotal", SubTotal + CGST);
                // oCustomerModel.setProperty("/DueAmount", SubTotal + CGST - CustData.PaymentPaid);

                // }else{
                // oCustomerModel.setProperty("/SGST", CGST)
                // oCustomerModel.setProperty("/CGST", CGST)
                //     oCustomerModel.setProperty("/GrandTotal", SubTotal + CGST * 2);
                // oCustomerModel.setProperty("/DueAmount", SubTotal + CGST * 2 - CustData.PaymentPaid);
                // }

                // oCustomerModel.setProperty("/SubTotal", SubTotal)

                // oCustomerModel.setProperty("/Discount", CustData.Discount)
                var SubTotal = fPrice + fFacilityPrice
                var CGST = SubTotal * CustData.GSTValue / 100

                let TotalAmount;

                if (CustData.GSTType === "IGST") {
                    TotalAmount = SubTotal + CGST;
                } else if (CustData.GSTType === "CGST/SGST") {
                    TotalAmount = SubTotal + CGST + CGST;
                } else {
                    TotalAmount = SubTotal
                }
                // if (CustData.CouponCode || this.Code) {
                //     var oCouponData = this.getView().getModel("CouponModel").getData();
                //     var sEnteredCode = this.Code || CustData.CouponCode; // user entered code
                //     var oMatchedCoupon = oCouponData.find(coupon => coupon.CouponCode === sEnteredCode);



                //     if (oMatchedCoupon.MinOrderValue <= TotalAmount) {

                //         if (oMatchedCoupon.DiscountType === "Percentage" && this.CouponDiscount || oMatchedCoupon.DiscountType === "Percentage" && CustData.Discount) {
                //             this.CouponDiscount = this.CouponDiscount || oMatchedCoupon.DiscountValue || "0"
                //             CustData.Discount = TotalAmount * Number(this.CouponDiscount) / 100
                //             if (oMatchedCoupon.UptoValue > 0 && CustData.Discount > oMatchedCoupon.UptoValue) {
                //                 CustData.Discount = Number(oMatchedCoupon.UptoValue);
                //             }
                //         } else {
                //             CustData.Discount = this.CouponDiscount || CustData.Discount || "0.00";
                //         }

                //     }
                // }

                if (CustData.GSTType === "IGST") {
                    oCustomerModel.setProperty("/IGST", CGST)


                } else {
                    oCustomerModel.setProperty("/SGST", CGST)
                    oCustomerModel.setProperty("/CGST", CGST)

                }
                oCustomerModel.setProperty("/GrandTotal", TotalAmount - Number(CustData.Discount));
                oCustomerModel.setProperty("/DueAmount", TotalAmount - Number(CustData.Discount) - CustData.PaymentPaid);
                oCustomerModel.setProperty("/SubTotal", SubTotal)

                oCustomerModel.setProperty("/Discount", CustData.Discount)

            }
        },

        onRoomBedChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            var oSelectedItem = oEvent.getParameter("selectedItem");

            if (!oSelectedItem) {
                // Clear operation
                var oCustomerModel = this.getView().getModel("CustomerData");
                oCustomerModel.setProperty("/RentPrice", 0);
                oCustomerModel.setProperty("/GrandTotal", 0);
                return;
            }

            var sBedType = oEvent.getParameter("selectedItem").getKey(); // Selected bed type
            var oBookingModel = this.getView().getModel("Bookingmodel");
            var oCustomerModel = this.getView().getModel("CustomerData");
            var CustData = this.getView().getModel("CustomerData").getData();
            // Update selected bed in Bookingmodel
            oBookingModel.setProperty("/BedTypeName", sBedType);

            var aAvailableBeds = this.getView().getModel("Availablebeds").getData(); // all available beds
            var sUnit = oCustomerModel.getProperty("/PaymentType"); // daily / monthly / yearly

            // Find the bed object
            var oSelectedBed = aAvailableBeds.find(bed => bed.BedTypeName === sBedType);

            if (oSelectedBed) {
                var fPrice = 0;
                var iDuration = 1; // default duration

                if (sUnit === "daily" || sUnit === "Per Day") {
                    fPrice = parseFloat(oSelectedBed.Price || 0);
                    // Calculate number of days
                    var sStartDate = oBookingModel.getProperty("/StartDate");
                    var sEndDate = oBookingModel.getProperty("/EndDate");

                    // Declare normalized variables
                    var sStart = "";
                    var sEnd = "";

                    // Normalize Start Date
                    if (sStartDate) {
                        if (sStartDate.includes("/")) {
                            // Convert dd/MM/yyyy → yyyy-MM-dd
                            sStart = sStartDate.split("/").reverse().join("-");
                        } else {
                            sStart = sStartDate;
                        }
                    }

                    // Normalize End Date
                    if (sEndDate) {
                        if (sEndDate.includes("/")) {
                            sEnd = sEndDate.split("/").reverse().join("-");
                        } else {
                            sEnd = sEndDate;
                        }
                    }
                    if (sStart && sEnd) {
                        var dStart = new Date(sStart);
                        var dEnd = new Date(sEnd);
                        // +1 to include start and end day
                        iDuration = Math.ceil((dEnd - dStart) / (1000 * 60 * 60 * 24));
                    }
                } else if (sUnit === "monthly" || sUnit === "Per Month") {
                    fPrice = parseFloat(oSelectedBed.MonthPrice || 0);
                    // Get selected months
                    iDuration = parseInt(oBookingModel.getProperty("/DurationUnit")) || 1;
                } else if (sUnit === "yearly" || sUnit === "Per Year") {
                    fPrice = parseFloat(oSelectedBed.YearPrice || 0);
                    // Get selected years
                    iDuration = parseInt(oBookingModel.getProperty("/DurationUnit")) || 1;
                }

                // Multiply by duration
                var fOriginalRentPrice = fPrice * iDuration;

                // Update model
                oCustomerModel.setProperty("/RentPrice", fOriginalRentPrice);
                oCustomerModel.setProperty("/OrginalRentPrice", fPrice);

                // Recalculate GrandTotal
                var fFacilityPrice = parseFloat(oCustomerModel.getProperty("/TotalFacilityPrice") || 0);

                var abeds = this.getView().getModel("Beddetails").getData().HM_BedType
                var Bedname = sBedType.replace(/\s*-\s*(AC|NON-AC)$/i, "").trim()
                var Acname = sBedType.includes("NON-AC") ? "NON-AC" : "AC"
                var Deposit = abeds.find((item) => {
                    if (item.Name === Bedname && item.BranchCode === CustData.BranchCode
                        && item.ACType === Acname) {
                        return item.Deposit
                    }
                })

                // if (CustData.CouponCode || this.Code) {
                //     var oCouponData = this.getView().getModel("CouponModel").getData();
                //     var sEnteredCode = this.Code || CustData.CouponCode; // user entered code
                //     var oMatchedCoupon = oCouponData.find(coupon => coupon.CouponCode === sEnteredCode);

                //     if (oMatchedCoupon.MinOrderValue <= (fFacilityPrice + (CustData.RentPrice || 0))) {

                //         if (oMatchedCoupon.DiscountType === "Percentage" && this.CouponDiscount || oMatchedCoupon.DiscountType === "Percentage" && CustData.Discount) {
                //             this.CouponDiscount = this.CouponDiscount || oMatchedCoupon.DiscountValue || "0"
                //             CustData.Discount = (fFacilityPrice + (CustData.RentPrice || 0)) * Number(this.CouponDiscount) / 100
                //             if (oMatchedCoupon.UptoValue > 0 && CustData.Discount > oMatchedCoupon.UptoValue) {
                //                 CustData.Discount = Number(oMatchedCoupon.UptoValue);
                //             }
                //         } else {
                //             CustData.Discount = this.CouponDiscount || CustData.Discount || "0.00";
                //         }

                //     }
                // }

                // var SubTotal = fOriginalRentPrice + fFacilityPrice - Number(CustData.Discount)
                // var CGST = SubTotal * CustData.GSTValue / 100


                // if(CustData.GSTType==="IGST"){
                // oCustomerModel.setProperty("/IGST", CGST)
                //  oCustomerModel.setProperty("/GrandTotal", SubTotal + CGST );
                // oCustomerModel.setProperty("/DueAmount", SubTotal + CGST- CustData.PaymentPaid);

                // }else{
                // oCustomerModel.setProperty("/SGST", CGST)
                // oCustomerModel.setProperty("/CGST", CGST)
                //  oCustomerModel.setProperty("/GrandTotal", SubTotal + CGST * 2);
                // oCustomerModel.setProperty("/DueAmount", SubTotal + CGST * 2 - CustData.PaymentPaid);
                // }

                // oCustomerModel.setProperty("/SubTotal", SubTotal)

                // oCustomerModel.setProperty("/Discount", CustData.Discount)
                // oCustomerModel.setProperty("/Deposit", Deposit.Deposit)

                var SubTotal = fOriginalRentPrice + fFacilityPrice
                var CGST = SubTotal * CustData.GSTValue / 100

                let TotalAmount;

                if (CustData.GSTType === "IGST") {
                    TotalAmount = SubTotal + CGST;
                } else if (CustData.GSTType === "CGST/SGST") {
                    TotalAmount = SubTotal + CGST + CGST;
                } else {
                    TotalAmount = SubTotal
                }
                // if (CustData.CouponCode || this.Code) {
                //     var oCouponData = this.getView().getModel("CouponModel").getData();
                //     var sEnteredCode = this.Code || CustData.CouponCode; // user entered code
                //     var oMatchedCoupon = oCouponData.find(coupon => coupon.CouponCode === sEnteredCode);


                //     if (oMatchedCoupon.MinOrderValue <= TotalAmount) {

                //         if (oMatchedCoupon.DiscountType === "Percentage" && this.CouponDiscount || oMatchedCoupon.DiscountType === "Percentage"
                //             && CustData.Discount) {
                //             this.CouponDiscount = this.CouponDiscount || oMatchedCoupon.DiscountValue || "0"
                //             CustData.Discount = TotalAmount * Number(this.CouponDiscount) / 100
                //             if (oMatchedCoupon.UptoValue > 0 && CustData.Discount > oMatchedCoupon.UptoValue) {
                //                 CustData.Discount = Number(oMatchedCoupon.UptoValue);
                //             }
                //         } else {
                //             CustData.Discount = this.CouponDiscount || CustData.Discount || "0.00";
                //         }

                //     }
                // }




                if (CustData.GSTType === "IGST") {
                    oCustomerModel.setProperty("/IGST", CGST)


                } else {
                    oCustomerModel.setProperty("/SGST", CGST)
                    oCustomerModel.setProperty("/CGST", CGST)

                }
                oCustomerModel.setProperty("/GrandTotal", TotalAmount - Number(CustData.Discount));
                oCustomerModel.setProperty("/DueAmount", TotalAmount - Number(CustData.Discount) - CustData.PaymentPaid);
                oCustomerModel.setProperty("/SubTotal", SubTotal)

                oCustomerModel.setProperty("/Discount", CustData.Discount)
                oCustomerModel.setProperty("/Deposit", Deposit.Deposit)



            }
        },

        onEditTimeChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            var oModel = this.getView().getModel("edit");
            var oData = oModel.getData();
            var sStart = oData.StartTime;  // Example: "9" or "09"
            var sEnd = oData.EndTime;      // Example: "17" or "17"

            if (!sStart || !sEnd) {
                return;
            }

            // Convert to number
            var startHour = parseFloat(sStart);
            var endHour = parseFloat(sEnd);

            // Validate numbers
            if (isNaN(startHour) || isNaN(endHour)) {
                sap.m.MessageToast.show(this.i18nModel.getText("invalidHourFormat"));
                oModel.setProperty("/TotalHour", "");
                return;
            }

            // Validate end > start
            if (endHour < startHour) {
                sap.m.MessageToast.show(this.i18nModel.getText("endTimeShouldbeGreaterthanStartTime"));
                oModel.setProperty("/TotalHour", "");
                return;
            }

            // Difference
            var diff = endHour - startHour;

            // Format (optional)
            var formatted = diff;
            oModel.setProperty("/TotalHour", formatted);
        },

        onCountrySelectionChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            const oView = this.getView();
            const oModel = oView.getModel("Bookingmodel");
            const oPhoneInput = this.byId("CD_ID_idPhone")
            const oStateCB = oView.byId("CC_id_State");
            const oCityCB = oView.byId("CC_id_City");
            const oSTD = oView.byId("CC_id_STDCode");

            const oItem = oEvent.getSource().getSelectedItem();
            if (!oItem) return;

            // Clear state + city
            oModel.setProperty("/State", "");
            oModel.setProperty("/City", "");

            oStateCB.setSelectedKey("");
            oCityCB.setSelectedKey("");
            oCityCB.setValue("");
            oStateCB.getBinding("items")?.filter([]);
            oCityCB.getBinding("items")?.filter([]);
            oSTD.setValue("");

            const sCountryName = oItem.getText();
            const sCountryCode = oItem.getAdditionalText();
            if (sCountryName === "India") {
                oPhoneInput.setMaxLength(10);
            } else {
                oPhoneInput.setValue("");
                oPhoneInput.setMaxLength(18);
            }

            oModel.setProperty("/country", sCountryName);

            // Fetch country STD code
            const aCountryData = this.getOwnerComponent().getModel("CountryModel").getData();
            const oCountryObj = aCountryData.find(c => c.countryName === sCountryName);
            oModel.setProperty("/STDCode", oCountryObj?.stdCode || "");
            oSTD.setValue(oCountryObj?.stdCode || "");

            // Filter state list
            oStateCB.getBinding("items")?.filter([
                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
            ]);
        },
        onSTDChange: function () {
            const oSTD = this.byId("CC_id_STDCode");
            const oMobile = this.byId("CD_ID_idPhone");

            const std = oSTD.getValue();
            oMobile.setValue("");

            // Dynamic maxLength
            if (std === "+91") {
                oMobile.setMaxLength(10);
            } else {
                oMobile.setMaxLength(18);
            }
        },

        // CC_onChangeState: function (oEvent) {
        //     utils._LCvalidateMandatoryField(oEvent);
        //     const oView = this.getView();
        //     const oModel = oView.getModel("Bookingmodel");
        //     const oItem = oEvent.getSource().getSelectedItem();
        //     const oCityCB = oView.byId("CC_id_City");
        //     const oCountryCB = oView.byId("CC_id_Country");

        //     // Reset
        //     oModel.setProperty("/City", "");
        //     oCityCB.setSelectedKey("");
        //     oCityCB.setValue("");
        //     oCityCB.getBinding("items")?.filter([]);

        //     if (!oItem) {
        //         oModel.setProperty("/State", "");
        //         return;
        //     }

        //     const sStateName = oItem.getKey();
        //     const sCountryCode = oCountryCB.getSelectedItem()?.getAdditionalText();
        //     oModel.setProperty("/State", sStateName);

        //     // Apply city filter
        //     oCityCB.getBinding("items")?.filter([
        //         new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sStateName),
        //         new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
        //     ]);
        // },

        onChange: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onmobileChange: function (oEvent) {
            const oSTD = this.byId("CC_id_STDCode");
            const oMobile = this.byId("CD_ID_idPhone");

            const std = oSTD.getValue().trim();      // get STD code
            const mobileValue = oMobile.getValue().trim();

            // Reset value state if empty
            if (mobileValue === "") {
                oMobile.setValueState("None");
                return;
            }

            // Determine required length
            let requiredLength = 10;

            // Validate length
            if (std === "+91" && mobileValue.length === requiredLength) {
                oMobile.setValueState("None");       // valid
            } else {
                oMobile.setValueState("Error");      // invalid
            }
            if (std != "+91") {
                oMobile.setValueState("None");       // valid

            }
        }
        ,

        onChangemail: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },

        onDateChange: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCvalidateDate(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },
        onPaymentTypeSelect: function (oEvent) {

          this.index = oEvent.getSource().getSelectedIndex();

            const isPayOnCheckIn =  this.index === 0;
            const isUPI =  this.index === 1;
            const isCard =  this.index === 2;

            this._togglePaymentSections(isUPI, isCard, isPayOnCheckIn);

            const oPaymentModel = this.getView().getModel("PaymentModel");
            const oHostelModel = this.getView().getModel("HostelModel");
            var CustomerData = this.getView().getModel("CustomerData").getData();

            var Bookingdata = this.getView().getModel("Bookingmodel").getData();

            var unit = Bookingdata.UnitText ? Bookingdata.UnitText.trim().toLowerCase() : "";
            var paymentMap = {
                "monthly": "Per Month",
                "yearly": "Per Year",
                "daily": "Per Day"
            };

            // Normalize UnitText: trim and lowercase
            var normalizedUnit = paymentMap[unit] || unit;

            const paymentType = normalizedUnit

            let totalPersonsMonthly = 0;

            if (paymentType === "Per Day") {

                totalPersonsMonthly = CustomerData.PaymentPaid ? CustomerData.GrandTotal - CustomerData.PaymentPaid : CustomerData.GrandTotal || 0;

            } else {
                let facilityAmount = 0;

                const facilities = CustomerData.AllSelectedFacilities || [];

                const bookingStart = this._parseDate(Bookingdata.StartDate);
                const bookingEnd = this._parseDate(Bookingdata.EndDate);

                facilityAmount = facilities.reduce((sum, item) => {

                    const facilityStart = this._parseDate(item.StartDate);
                    const facilityEnd = this._parseDate(item.EndDate);
// && !item.FacilityID
                    // check facility inside booking range
                    if (facilityStart <= bookingEnd && facilityEnd >= bookingStart ) {

                        let totalAmount = Number(item.TotalAmount) || 0;

                        // calculate facility months
                        let months = (facilityEnd.getFullYear() - facilityStart.getFullYear()) * 12 +
                            (facilityEnd.getMonth() - facilityStart.getMonth());

                        if (months <= 0) {
                            months = 1;
                        }
                         let years = Math.ceil(months / 12);
                         let firstMonthAmount = 0;
                         if (paymentType === "Per Year") {

                           firstMonthAmount = totalAmount / years;

                             } else if(paymentType === "Per Month") {

                               firstMonthAmount = totalAmount / months;
                             }

                        return sum + firstMonthAmount;
                    }

                    return sum;

                }, 0);
                let baseAmount;
                // if(CustomerData.PaymentPaid ==="0.00"){
                  baseAmount =  Number(CustomerData.PaymentPaid || 0)==="0.00" ?
                   (facilityAmount + (CustomerData.RentPrice / CustomerData.Duration)) - Number(CustomerData.PaymentPaid || 0) - Number(CustomerData.Discount) :
                      (facilityAmount + (CustomerData.RentPrice / CustomerData.Duration))
                // }else{
                //   baseAmount = facilityAmount;
                // }

                let CGST = 0;
                let SGST = 0;
                let IGST = 0;

                if (CustomerData.GSTType === "CGST/SGST") {

                    CGST = baseAmount * Number(CustomerData.GSTValue) / 100;
                    SGST = baseAmount * Number(CustomerData.GSTValue) / 100;

                } else if (CustomerData.GSTType === "IGST") {

                    IGST = baseAmount * Number(CustomerData.GSTValue) / 100;

                }

                let Gst = CGST + SGST + IGST;
                totalPersonsMonthly = Number(CustomerData.PaymentPaid || 0) ? Gst +baseAmount - Number(CustomerData.PaymentPaid || 0)  - Number(CustomerData.Discount) : Gst + baseAmount  - Number(CustomerData.Discount)  || 0 
                
            }

            oHostelModel.setProperty(
                "/PerMonthNoPerson",
                Number(totalPersonsMonthly.toFixed(2))
            );

            // PAY ON CHECKIN
            if (isPayOnCheckIn) {

                oPaymentModel.setProperty("/PaymentType", "PayOnCheckIn");
                oPaymentModel.setProperty("/Amount", "0");
                oPaymentModel.setProperty("/PaymentDate", "");


                oHostelModel.setProperty(
                    "/PayableAmountPerMonth",
                    totalPersonsMonthly
                );

                return;
            }

            // UPI OR CARD
            oPaymentModel.setProperty(
                "/PaymentType",
                isUPI ? "UPI" : "CARD"
            );
              oHostelModel.setProperty(
                "/PaymentType",
                isUPI ? "UPI" : "CARD"
            );

            oPaymentModel.setProperty(
                "/PaymentDate",
                this.Formatter.formatDate(new Date())
            );

            oPaymentModel.setProperty(
                "/Amount",
                totalPersonsMonthly
            );

            oHostelModel.setProperty(
                "/PayableAmountPerMonth",
                totalPersonsMonthly
            );
        },
        _togglePaymentSections: function (isUPI, isCard, isPayOnCheckIn) {

            const oUPI = sap.ui.getCore().byId("idUPISection");
            const oCard = sap.ui.getCore().byId("idCardSection");
            const oRightPanel = sap.ui.getCore().byId("idRightPanel");

            if (isPayOnCheckIn) {

                if (oUPI) oUPI.setVisible(false);
                if (oCard) oCard.setVisible(false);
                if (oRightPanel) oRightPanel.setVisible(false);

            } else {

                if (oUPI) oUPI.setVisible(isUPI);
                if (oCard) oCard.setVisible(isCard);
                if (oRightPanel) oRightPanel.setVisible(true);
            }

            // clear all fields
            const aFields = [
                "idAmount",
                "idPaymentTypeField",
                "idTransactionID",
                "idPaymentDate",
                "idCardNumber",
                "idCardExpiry",
                "idCardCVV"
            ];

            aFields.forEach(function (sId) {

                const oControl = sap.ui.getCore().byId(sId);

                if (oControl) {

                    oControl.setValue("");
                    oControl.setValueState("None");
                    oControl.setValueStateText("");
                }

            });
        },

        onSaveBooking: function () {
            var Bookingdata = this.getView().getModel("Bookingmodel").getData();
            var CustomerData = this.getView().getModel("CustomerData").getData();
            var LoginModel = this.getView().getModel("LoginModel").getData();

            const oHostelModel = this.getView().getModel("HostelModel");

            const oInput = this.byId("CD_ID_idPhone")

            // Mandatory validation
            const isMandatoryValid = (
                utils._LCstrictValidationComboBox(this.byId("Ad_id_RoomType"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("idPaymentMethod1"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("Ad_id_editStartDate"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("AD_id_CustomerName"), "ID") &&
                utils._LCvalidateDate(this.byId("AD_id_Date"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("Ad_id_gender"), "ID") &&
                utils._LCvalidateEmail(this.byId("Ad_id_CustomerEmail"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("CC_id_Country"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("CC_id_State"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("CC_id_City"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("Ad_id_Address"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("CC_id_STDCode"), "ID")
            );
            Bookingdata.EndDate = (Bookingdata.EndDate).includes("/") ? Bookingdata.EndDate : Bookingdata.EndDate.split('-').reverse().join('/')
            var BookingdataEndDate = (Bookingdata.EndDate).includes("/") ? this._parseDate(Bookingdata.EndDate) : Bookingdata.EndDate

            const facilityItems = CustomerData.AllSelectedFacilities || [];

            const invalidFacilities = [];

            for (let i = 0; i < facilityItems.length; i++) {
                const item = facilityItems[i];

                const facilityStart = this._parseDate(item.StartDate);
                const facilityEnd = this._parseDate(item.EndDate);



                // Validation: must be inside booking period
                if (
                    facilityStart < this._parseDate(Bookingdata.StartDate) ||
                    facilityEnd > BookingdataEndDate
                ) {
                    invalidFacilities.push(item.FacilityName);
                }

            }

            if (invalidFacilities.length > 0) {
                sap.m.MessageBox.error(
                    "The following facilities have dates outside the booking period:\n\n" +
                    invalidFacilities.map(name => `• ${name}`).join("\n") +
                    `\n\nPlease ensure all facility dates are between ` +
                    `${Bookingdata.StartDate} and ${Bookingdata.EndDate}.`
                );
                return; // ⛔ stop save
            }


            if (Bookingdata.STDCode === "+91") {
                if (Bookingdata.MobileNo.length === 10) {
                    oInput.setValueState("None");

                } else {
                    oInput.setValueState("Error");
                    sap.m.MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));

                    return;
                }
            }

            if (!isMandatoryValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));
                return;
            }

            // Map UnitText to desired PaymentType
            var paymentMap = {
                "monthly": "Per Month",
                "yearly": "Per Year",
                "daily": "Per Day"
            };

            // Normalize UnitText: trim and lowercase
            var unit = Bookingdata.UnitText ? Bookingdata.UnitText.trim().toLowerCase() : "";

            if (CustomerData.OrginalRentPrice === 0 || CustomerData.OrginalRentPrice === "0.00") {
                sap.m.MessageToast.show("We do not offer a Payment (" + paymentMap[unit] + ") plan in our Hostel.");
                return;
            }
            if(LoginModel.Role === "Customer"){
            if (paymentMap[unit] === "Per Day"
                && (CustomerData.Duration * Number(CustomerData.OrginalRentPrice) > this.RentPrice || CustomerData.TotalFacilityPrice > this.FacilityPrice) 
                && this.flag!==true && CustomerData.DueAmount > 0) {
                if (!this.PP_Dialog) {
                    var oView = this.getView();
                    this.PP_Dialog = sap.ui.xmlfragment(
                        "sap.ui.com.project1.fragment.Payment_Edit",
                        this
                    );
                    oView.addDependent(this.PP_Dialog);
                }

                this.PP_Dialog.open();

                // set grand total
                oHostelModel.setProperty("/GrandTotal", CustomerData.GrandTotal);

                // default payment UI state
                setTimeout(() => {
                    const oGroup = sap.ui.getCore().byId("idPaymentTypeGroup");

                    if (oGroup) {
                        oGroup.setSelectedIndex(0); // Pay On CheckIn

                        this.onPaymentTypeSelect({
                            getSource: () => oGroup
                        });
                    }
                }, 100);
                return;
            } else if (
                (paymentMap[unit] === "Per Month" || paymentMap[unit] === "Per Year") && (CustomerData.TotalFacilityPrice > this.FacilityPrice || Number(CustomerData.OrginalRentPrice) > this.RentPrice)  
                && this.flag!==true && CustomerData.DueAmount > 0
            ) {
                if (!this.PP_Dialog) {
                    var oView = this.getView();
                    this.PP_Dialog = sap.ui.xmlfragment(
                        "sap.ui.com.project1.fragment.Payment_Edit",
                        this
                    );
                    oView.addDependent(this.PP_Dialog);
                }

                this.PP_Dialog.open();

                // set grand total
                oHostelModel.setProperty("/GrandTotal", CustomerData.GrandTotal);

                // default payment UI state
                setTimeout(() => {
                    const oGroup = sap.ui.getCore().byId("idPaymentTypeGroup");

                    if (oGroup) {
                        oGroup.setSelectedIndex(0); // Pay On CheckIn

                        this.onPaymentTypeSelect({
                            getSource: () => oGroup
                        });
                    }
                }, 100);
                return;
            }
        }

            var Payload = {
                "CustomerName": Bookingdata.CustomerName,
                "UserID": CustomerData.UserID,
                "MobileNo": Bookingdata.MobileNo,
                "Gender": Bookingdata.Gender,
                "DateOfBirth": Bookingdata.DateOfBirth.split('/').reverse().join('-'),
                "CustomerEmail": Bookingdata.CustomerEmail,
                "Country": Bookingdata.Country,
                "State": Bookingdata.State,
                "City": Bookingdata.City,
                "STDCode": Bookingdata.STDCode,
                "Salutation": CustomerData.Salutation || "Mr.",
                "PermanentAddress": Bookingdata.Address,
                "Booking": [{
                    "BookingDate": new Date().toISOString().split('T')[0], // current date
                    "RentPrice": CustomerData.GrandTotal,
                    "NoOfPersons": CustomerData.NoOfPersons,
                    "StartDate": Bookingdata.StartDate.split('/').reverse().join('-'),
                    "EndDate": Bookingdata.EndDate.split('/').reverse().join('-'),
                    "PaymentType": paymentMap[unit] || Bookingdata.UnitText, // fallback
                    "BedType": Bookingdata.BedTypeName,
                    "RoomPrice": CustomerData.OrginalRentPrice,
                    "Discount": CustomerData.Discount || 0,
                    "CouponCode": Bookingdata.CouponCode,
                    "TotalRoomprice": CustomerData.RentPrice,
                    "GSTType": CustomerData.GSTType,
                    "GSTValue": CustomerData.GSTValue,
                }],
                "FacilityItems": CustomerData.AllSelectedFacilities.map(item => {
                    // Normalize UnitText for facility as well
                    var itemUnit = item.UnitText ? item.UnitText.trim().toLowerCase() : "";
                    return {
                        FacilityID: item.FacilityID,
                        FacilityName: item.FacilityName,
                        FacilitiPrice: item.TotalAmount,
                        StartDate: item.StartDate.split('/').reverse().join('-'),
                        EndDate: item.EndDate.split('/').reverse().join('-'),
                        UnitText: paymentMap[itemUnit] || item.UnitText, // convert to Per Month/Day/Year
                        TotalHour: item.TotalHour,
                        BookingID: CustomerData.BookingID,
                        CustomerID: CustomerData.CustomerID,
                        Currency: item.Currency,
                        StartTime: item.StartTime,
                        EndTime: item.EndTime,
                        BasicFacilityPrice: item.Price,
                        CouponCode: item.CouponCode || "",
                        CouponDiscount: item.CouponDiscount || "0.00" 
                    };
                }),
                "Documents": CustomerData.Documents.map(item => {
                    // Normalize UnitText for facility as well
                    return {
                        DocumentID: item.DocumentID,
                        DocumentType: item.DocumentType,
                        CustomerID: CustomerData.CustomerID,
                        FileName: item.FileName,
                        FileType: item.FileType,
                        File: item.File
                    };
                })
            };


            const customerEndDate = this._parseDate(CustomerData.EndDate);
            const bookingEndDate = this._parseDate(Bookingdata.EndDate);

            let isAnyFacilityMatchingBookingEnd = true;

            for (let i = 0; i < facilityItems.length; i++) {
                const facilityEnd = this._parseDate(facilityItems[i].EndDate);

                if (facilityEnd.getTime() !== bookingEndDate.getTime()) {
                    isAnyFacilityMatchingBookingEnd = false;
                    break;
                }
            }
            if (customerEndDate < bookingEndDate && !isAnyFacilityMatchingBookingEnd) {

                var that = this;

                sap.m.MessageBox.confirm(
                    "Would you like to extend your facility duration until the end of your booking? Kindly update this in your facility.",
                    {
                        title: "Upgrade Required",
                        actions: ["Extend Now", "Maybe Later"],
                        emphasizedAction: sap.m.MessageBox.Action.OK,

                        onClose: function (sAction) {
                            if (sAction === "Maybe Later") {
                                that.oneditsavebooking(Payload);
                            }

                        }
                    }
                );

                return;
            }
            if(this.flag===true && this.index !== 0){
            var PaymentPayload = {
                "BookingID": CustomerData.BookingID,
                "CustomerName": Bookingdata.CustomerName,
                "Date": new Date().toISOString().split('T')[0],
                "Amount":oHostelModel.getProperty("/PerMonthNoPerson"),
                "PaymentType": oHostelModel.getProperty("/PaymentType"), // fallback to original if mapping not found
                "BankTransactionID": sap.ui.getCore().byId("idTransactionID").getValue() || "",
                "CustomerID": CustomerData.CustomerID,
                "Currency": CustomerData.Currency || "INR",
                "BranchCode": CustomerData.BranchCode || "",
                "BranchName": CustomerData.BranchName || "",

            }
            this.getBusyDialog()

             this.ajaxCreateWithJQuery("HM_PaymentDetail", {
                data: PaymentPayload,
               
            })
        }
            // Send payload
            this.getBusyDialog()

            this.ajaxUpdateWithJQuery("HM_Customer", {
                data: [Payload],
                filters: {
                    CustomerID: CustomerData.CustomerID
                }
            })
                .then(() => {

                    // Refresh models
                    this.AD_onSearch();
                     if (this.PP_Dialog) {
                       this.PP_Dialog.close();
                           }
                           this.flag=false
                    
                    sap.m.MessageToast.show(this.i18nModel.getText("bookingSavedSuccessfully"));

                    this.getView().getModel("VisibleModel").setProperty("/visible", false);
                    this.byId("idMonthYearSelect").setVisible(false);
                }).catch(err => {
                    sap.m.MessageToast.show(this.i18nModel.getText("errorSavingBooking"));
                    console.error(err);
                });
             
        },
           onTransactionIDChange: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },
        onSubmitPress:function(){
            const oPaymentModel = this.getView().getModel("PaymentModel");
            const paymentType = oPaymentModel.getProperty("/PaymentType");
            const isPayOnCheckIn = paymentType === "PayOnCheckIn";

            if (!isPayOnCheckIn) {
                const isMandatoryValid = (
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idTransactionID"), "ID") &&
                    utils._LCvalidateDate(sap.ui.getCore().byId("idPaymentDate"), "ID")
                );

                if (!isMandatoryValid) {
                    MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));
                    return;
                }
            }
            this.flag=true
             this.onSaveBooking();

        },
        onPaymentClose: function () {
                this.flag=false

             if (this.PP_Dialog) {
                this.PP_Dialog.close();
             }
        },
        oneditsavebooking: function (Payload) {
            var CustomerData = this.getView().getModel("CustomerData").getData();

            this.getBusyDialog()
            this.ajaxUpdateWithJQuery("HM_Customer", {
                data: [Payload],
                filters: {
                    CustomerID: CustomerData.CustomerID
                }
            })
                .then(() => {

                    // Refresh models
                    this.AD_onSearch();
                    sap.m.MessageToast.show(this.i18nModel.getText("bookingSavedSuccessfully"));

                    this.getView().getModel("VisibleModel").setProperty("/visible", false);
                    this.byId("idMonthYearSelect").setVisible(false);
                })
                .catch(err => {
                    sap.m.MessageToast.show(this.i18nModel.getText("errorSavingBooking"));
                    console.error(err);
                });
        },

        onPressCancelBooking: async function (oEvent) {
            var oHostelModel = this.getView().getModel("CustomerData");
            var oData = oHostelModel.getData();
            var that = this;

            sap.m.MessageBox.confirm(
                "Are you sure you want to cancel this Booking?", {
                title: "Confirm Cancellation",
                icon: sap.m.MessageBox.Icon.WARNING,
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                onClose: async function (oAction) {
                    if (oAction !== sap.m.MessageBox.Action.YES) {
                        return;
                    }

                    try {
                        var today = new Date();
                        var sCancelDate = today.toISOString().split("T")[0]; // YYYY-MM-DD

                        //------ Booking Payload including Status and CancelDate ------
                        const bookingData = [{
                            BookingDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                            RentPrice: oData.GrandTotal ? oData.GrandTotal.toString() : "0",
                            RoomPrice: oData.RoomPrice || "0",
                            NoOfPersons: oData.noofperson || 1,
                            Customerid: oData.CustomerId,
                            StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                            EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                            Status: "Cancelled", // UPDATED
                            CancelDate: sCancelDate, // UPDATED
                            PaymentType: oData.PaymentType || "",
                            BedType: oData.BedType || ""
                        }];

                        //------ Facility Payload ------
                        const facilityData = [];
                        if (oData.AllSelectedFacilities?.length > 0) {
                            oData.AllSelectedFacilities.forEach(fac => {
                                facilityData.push({
                                    PaymentID: "",
                                    FacilityName: fac.FacilityName,
                                    FacilitiPrice: fac.Price,
                                    StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                                    EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                                    PaidStatus: "Cancelled" // UPDATED (optional)
                                });
                            });
                        }

                        //------ Final Payload ------
                        const personData = [{
                            Salutation: oData.Salutation || "",
                            CustomerName: oData.FullName || "",
                            UserID: oData.UserID || "",
                            CustomerID: oData.CustomerID || "",
                            STDCode: oData.STDCode || "",
                            MobileNo: oData.MobileNo || "",
                            Gender: oData.Gender || "",
                            DateOfBirth: oData.DateOfBirth ? oData.DateOfBirth.split("/").reverse().join("-") : "",
                            CustomerEmail: oData.CustomerEmail || "",
                            Country: oData.Country || "",
                            State: oData.State || "",
                            City: oData.City || "",
                            PermanentAddress: oData.Address || "",
                            Booking: bookingData, // Making sure included
                            FacilityItems: facilityData
                        }];

                        this.getBusyDialog()
                        const custid = oData.BookingID; // FIXED

                        await that.ajaxUpdateWithJQuery("HM_Customer", {
                            data: personData,
                            filters: {
                                BookingID: custid
                            }
                        });

                        that.AD_onSearch();
                        that.getView().getModel("VisibleModel").setProperty("/visible", false);
                        that.byId("idMonthYearSelect").setVisible(false);
                        sap.m.MessageToast.show(that.i18nModel.getText("bookingCancelledSuccessfully"));

                        // Hide Extra Buttons after Cancel
                        that.byId("idedit")?.setVisible(false);
                        that.byId("idcancel")?.setVisible(false);

                    } catch (err) {
                        this.closeBusyDialog()
                        sap.m.MessageToast.show(err.message || err.responseText);
                    } finally {
                    }
                }
            }
            );
        },

        onFacilityFileChange: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var aFiles = oEvent.getParameter("files");  // selected files
            var oCustomerModel = this.getView().getModel("CustomerData");
            var DocumentType = this.getView().getModel("Bookingmodel").getData().DocumentType;
            var aDocs = oCustomerModel.getProperty("/Documents") || [];

            aDocs.find((item) => {
                if (item.DocumentType?.replace(/\s+/g, '').toLowerCase() === DocumentType?.replace(/\s+/g, '').toLowerCase()) {
                    sap.m.MessageToast.show("Document of type '" + DocumentType + "' is Already Uploaded.");
                    oFileUploader.clear();
                    return;
                }
            })

            if (!DocumentType) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectDocumentTypeFirst"));
                oFileUploader.clear();
                return;
            }

            if (!aFiles || aFiles.length === 0) {
                return;
            }
            aFiles = Array.from(aFiles);
            const MAX_SIZE = 2 * 1024 * 1024;

            aFiles.forEach(file => {
                if (file.size > MAX_SIZE) {
                    sap.m.MessageToast.show("File " + file.name + " Exceeds 2 MB Limit.");
                    return; // skip this file
                }
                var reader = new FileReader();

                reader.onload = (e) => {
                    var sBase64 = e.target.result.split(",")[1]; // file base64 string
                    var isDuplicate = aDocs.some(doc => doc.FileName === file.name);

                    if (isDuplicate) {
                        sap.m.MessageToast.show("File '" + file.name + "' is Already Uploaded.");
                        return;
                    }
                    // Push new document into table array
                    aDocs.push({
                        DocumentType: DocumentType,
                        FileName: file.name,
                        FileType: file.type,
                        File: sBase64      // store file content if needed
                    });

                    oCustomerModel.setProperty("/Documents", aDocs);
                    oCustomerModel.refresh(true)
                };

                // Read file as Base64
                reader.readAsDataURL(file);
            });
            this.UD_Dialog.close();
        },

        onDocumentDelete: function (oEvent) {
            var oCustomerModel = this.getView().getModel("CustomerData");
            var aDocs = oCustomerModel.getProperty("/Documents") || [];
            var oItem = oEvent.getParameter("listItem");
            var oCtx = oItem.getBindingContext("CustomerData");
            var iIndex = oCtx.getPath().split("/").pop();
            var oDoc = aDocs[iIndex];

            var that = this;

            // If saved document → ask confirmation + AJAX delete
            if (oDoc.DocumentID) {
                MessageBox.confirm(
                    "This Document is already Saved. Do you want to Delete it?",
                    {
                        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                        onClose: function (sAction) {

                            if (sAction === MessageBox.Action.YES) {
                                that.ajaxDeleteWithJQuery("HM_CustomerDocument", {
                                    filters: {
                                        DocumentID: oDoc.DocumentID
                                    }
                                })
                                    .then(function () {
                                        // Remove from model
                                        aDocs.splice(iIndex, 1);
                                        oCustomerModel.setProperty("/Documents", aDocs);
                                        oCustomerModel.refresh(true)

                                        sap.m.MessageToast.show(this.i18nModel.getText("docdeletedSuccess"));

                                    })
                                    .catch(function () {
                                        sap.m.MessageToast.show(this.i18nModel.getText("failedDeleteDocumentfromServer"));
                                    });
                            }
                        }
                    }
                );
            } else {
                // No DocumentID → only local delete
                aDocs.splice(iIndex, 1);
                oCustomerModel.setProperty("/Documents", aDocs);
                oCustomerModel.refresh(true)

                sap.m.MessageToast.show(this.i18nModel.getText("documentRemoved"));
            }
        },

        onFileNameLinkPress: function (oEvent) {

            function autoDecodeBase64(b64) {
                if (!b64) return "";
                b64 = b64.replace(/\s/g, "");
                let last = b64;

                for (let i = 0; i < 5; i++) {
                    try {
                        if (
                            last.startsWith("iVB") ||    // PNG
                            last.startsWith("/9j") ||    // JPG
                            last.startsWith("JVBER")     // PDF
                        ) {
                            return last;
                        }
                        last = atob(last);
                    } catch (e) {
                        break;
                    }
                }
                return last;
            }

            const oDoc = oEvent.getSource()
                .getBindingContext("CustomerData")
                ?.getObject();

            if (!oDoc || !(oDoc.FileContent || oDoc.File)) {
                sap.m.MessageToast.show("No document found");
                return;
            }

            const sBase64 = autoDecodeBase64(oDoc.FileContent || oDoc.File);

            let sMimeType = "application/octet-stream";
            let isPDF = false;

            if (sBase64.startsWith("iVB") || sBase64.includes("image/png")) {
                sMimeType = "image/png";
            } else if (sBase64.startsWith("/9j") || sBase64.includes("image/jpeg")) {
                sMimeType = "image/jpeg";
            } else if (sBase64.startsWith("JVBER") || sBase64.includes("application/pdf")) {
                sMimeType = "application/pdf";
                isPDF = true;
            }

            /* ================= IMAGE PREVIEW ================= */
            if (sMimeType.startsWith("image/")) {

                const sImageSrc = sBase64.includes("data:") ? sBase64 : `data:${sMimeType};base64,${sBase64}`;

                if (!this._oDocPreviewDialog) {

                    const oFlex = new sap.m.FlexBox({
                        width: "100%",
                        height: "100%",
                        justifyContent: "Center",
                        alignItems: "Center",
                        items: [
                            new sap.m.Image({
                                id: this.createId("docPreviewImage"),
                                densityAware: false,
                                width: "100%",
                                height: "100%"
                            })
                        ]
                    });

                    this._oDocPreviewDialog = new sap.m.Dialog({
                        title: oDoc.FileName || "Document Preview",
                        contentWidth: "50%",
                        contentHeight: "60%",
                        draggable: true,
                        resizable: true,
                        contentPadding: "0rem",
                        content: [oFlex],
                        beginButton: new sap.m.Button({
                            text: "Close",
                            press: () => this._oDocPreviewDialog.close()
                        }),
                        afterClose: () => {
                            this._oDocPreviewDialog.destroy();
                            this._oDocPreviewDialog = null;
                        }
                    });

                    this.getView().addDependent(this._oDocPreviewDialog);
                }

                this.byId("docPreviewImage").setSrc(sImageSrc);
                this._oDocPreviewDialog.open();
                return;
            }

            /* ================= PDF PREVIEW ================= */
            if (isPDF) {

                if (!this._oDocPreviewDialog) {
                    this._oDocPreviewDialog = new sap.m.Dialog({
                        title: oDoc.FileName || "Document Preview",
                        stretch: true,
                        draggable: true,
                        resizable: true,
                        contentPadding: "0rem",
                        endButton: new sap.m.Button({
                            text: "Close",
                            press: () => {
                                if (this._previewUrl) {
                                    URL.revokeObjectURL(this._previewUrl);
                                    this._previewUrl = null;
                                }
                                this._oDocPreviewDialog.close();
                            }
                        }),
                        afterClose: () => {
                            this._oDocPreviewDialog.destroy();
                            this._oDocPreviewDialog = null;
                        }
                    });

                    this.getView().addDependent(this._oDocPreviewDialog);
                }

                this._oDocPreviewDialog.removeAllContent();
                let sPdfBase64 = sBase64;
                if (sPdfBase64.includes("base64,")) {
                    sPdfBase64 = sPdfBase64.split("base64,").pop();
                }

                const byteCharacters = atob(sPdfBase64);
                const byteArrays = [];

                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice = byteCharacters.slice(offset, offset + 512);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    byteArrays.push(new Uint8Array(byteNumbers));
                }

                const blob = new Blob(byteArrays, { type: sMimeType });

                if (this._previewUrl) {
                    URL.revokeObjectURL(this._previewUrl);
                }
                this._previewUrl = URL.createObjectURL(blob);

                this._oDocPreviewDialog.addContent(
                    new sap.ui.core.HTML({
                        sanitizeContent: false,
                        content: `
                    <iframe
                        src="${this._previewUrl}"
                        style="width:100%; height:600px; border:none;">
                    </iframe>
                `
                    })
                );

                this._oDocPreviewDialog.open();
                return;
            }

            sap.m.MessageToast.show("Preview not supported");
        },
        onApplyCoupon: async function () {
            var oCustomerData = this.getView().getModel("CustomerData").getData();
            var Bookingmodel = this.getView().getModel("Bookingmodel").getData();

            var sEnteredCode = Bookingmodel.CouponCode || this.getView().byId("couponInput").getValue();
            const filter = {
                CouponCode: sEnteredCode,
                Status: "Active"
            };
            this.getBusyDialog()
            await this.ajaxReadWithJQuery("HM_Coupon", filter).then((oData) => {
                var aCoupon = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(aCoupon);
                this.getView().setModel(model, "CouponModel")

            });
            this.closeBusyDialog()
            var oCouponData = this.getView().getModel("CouponModel").getData();

            // user entered code
            this.Code = Bookingmodel.CouponCode; // user entered code
            if (!sEnteredCode) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseEnterCouponCode"));
                return;
            }

            if (oCustomerData.CouponCode === sEnteredCode) {
                sap.m.MessageToast.show(this.i18nModel.getText("couponAlreadyApplied"));
                return;
            }

            // 1. Check coupon exists
            var oCoupon = oCouponData.find(c => c.CouponCode === sEnteredCode);
            if (!oCoupon) {
                sap.m.MessageToast.show(this.i18nModel.getText("invalidCouponCode"));
                return;
            }
            if (oCoupon.BranchCode !== oCustomerData.BranchCode) {
                sap.m.MessageToast.show(this.i18nModel.getText("thiscouponnotAvailableforthisBranch"));
                return;
            }

            if (Bookingmodel.StartDate.includes("/")) {
                Bookingmodel.StartDate = Bookingmodel.StartDate.split("/").reverse().join("-");
            } else if (Bookingmodel.EndDate.includes("/")) {
                Bookingmodel.EndDate = Bookingmodel.EndDate.split("/").reverse().join("-");
            }
            // 2. Date validation
            var custStart = new Date(Bookingmodel.StartDate);
            var custEnd = new Date(Bookingmodel.EndDate);
            var coupStart = new Date(oCoupon.StartDate);
            var coupEnd = new Date(oCoupon.EndDate);

            if (custStart < coupStart || custStart > coupEnd) {
                sap.m.MessageToast.show(this.i18nModel.getText("couponnotValidforSelectedDates"));
                return; // Exit function immediately
            }
            if (!oCoupon.Status === "Active") {
                sap.m.MessageToast.show(this.i18nModel.getText("couponnotActive"));
                return;
            }

            // 3. Percentage discount

            var subtotal = oCustomerData.RentPrice + oCustomerData.TotalFacilityPrice
            oCoupon.MinOrderValue = Number(oCoupon.MinOrderValue)
            if (oCoupon.MinOrderValue > subtotal) {
                sap.m.MessageToast.show("Coupon not Applicable for Below Minimum Value" + ' ' + oCoupon.MinOrderValue);
                return;
            }
            this.originalDis = oCustomerData.Discount
            this.CouponDiscount = oCoupon.DiscountValue

            var discountAmount = 0;
            var newSubtotal = "";

            // Check discount type
            if (oCoupon.DiscountType === "Percentage") {
                discountAmount = (subtotal * Number(oCoupon.DiscountValue || 0)) / 100;
                if (oCoupon.UptoValue > 0 && discountAmount > oCoupon.UptoValue) {
                    discountAmount = Number(oCoupon.UptoValue);
                }
                newSubtotal = subtotal - discountAmount;
            } else if (oCoupon.DiscountType === "Fixed Amount") {
                discountAmount = Number(oCoupon.DiscountValue || 0);
                newSubtotal = subtotal - discountAmount;
            }
            var cgst = newSubtotal * 0.09;
            var sgst = newSubtotal * 0.09;
            var grandTotal = newSubtotal + cgst + sgst;

            // 5. Update Model
            oCustomerData.Discount = discountAmount.toFixed(2);
            oCustomerData.SubTotal = newSubtotal;
            oCustomerData.CGST = cgst;
            oCustomerData.SGST = sgst;
            oCustomerData.GrandTotal = grandTotal;

            this.getView().getModel("CustomerData").refresh(true);
            this.getView().getModel("VisibleModel").setProperty("/IsCouponApplied", true);

            sap.m.MessageToast.show(this.i18nModel.getText("couponAppliedSuccessfully"));
        },

        onEditCouponCodeLiveChange: async function () {
            var oCustomerData = this.getView().getModel("CustomerData").getData();
            var edit = this.getView().getModel("edit").getData();




            var sEnteredCode = edit.CouponCode || sap.ui.getCore().byId("ID_editCouponCode").getValue();
            if (!sEnteredCode) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseEnterCouponCode"));
                return;
            }

            const filter = {
                CouponCode: sEnteredCode,
                Status: "Active"
            };
            this.getBusyDialog()
            await this.ajaxReadWithJQuery("HM_CouponFacilityCount", filter).then((oData) => {
                var aCoupon = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(aCoupon);
                this.getView().setModel(model, "CouponModel")

            });
            this.closeBusyDialog()
            var oCouponData = this.getView().getModel("CouponModel").getData();


            var oCoupon = oCouponData.find(c => c.CouponCode === sEnteredCode);
            if (!oCoupon) {
                sap.m.MessageToast.show(this.i18nModel.getText("invalidCouponCode"));
                return;
            }
            var bCouponLimitReached = false;

            if (oCouponData) {
                for (let i = 0; i < oCustomerData.AllSelectedFacilities.length; i++) {
                    let item = oCustomerData.AllSelectedFacilities[i];

                    if (item.CouponCode) {

                        var oCoupon = oCouponData.find(c => c.CouponCode === item.CouponCode);
                        if (!oCoupon) {
                            continue;
                        }

                        // Count coupon usage in AllSelectedFacilities
                        var iUsedCount = oCustomerData.AllSelectedFacilities.filter(f =>
                            f.CouponCode === item.CouponCode
                        ).length;

                        if (iUsedCount === Number(oCoupon.MaxUses)) {
                            sap.m.MessageToast.show(
                                this.i18nModel.getText(
                                    "couponUsageLimitReached",
                                    [oCoupon.MaxUses]
                                )
                            );

                            bCouponLimitReached = true;
                            break;
                        }
                    }
                }
            }

            if (bCouponLimitReached) {
                return;
            }
            if (Number(oCoupon.MaxUses) === oCoupon.couponUsedCount) {
                sap.m.MessageToast.show(this.i18nModel.getText("couponUsageLimitReached"));
                return;
            }

            if (oCoupon.BranchCode !== oCustomerData.BranchCode) {
                sap.m.MessageToast.show(this.i18nModel.getText("thiscouponnotAvailableforthisBranch"));
                return;
            }

            // if (oCoupon.BranchCode !== oCustomerData.BranchCode) {
            //     sap.m.MessageToast.show(this.i18nModel.getText("thiscouponnotAvailableforthisBranch"));
            //     return;
            // }

            if (edit.StartDate.includes("/")) {
                edit.StartDate = edit.StartDate.split("/").reverse().join("-");
            } else if (edit.EndDate.includes("/")) {
                edit.EndDate = edit.EndDate.split("/").reverse().join("-");
            }
            // 2. Date validation
            var custStart = new Date(edit.StartDate);
            var custEnd = new Date(edit.EndDate);
            var coupStart = new Date(oCoupon.StartDate);
            var coupEnd = new Date(oCoupon.EndDate);

            if (custStart < coupStart || custStart > coupEnd) {
                sap.m.MessageToast.show(this.i18nModel.getText("couponnotValidforSelectedDates"));
                return; // Exit function immediately
            }
            if (!oCoupon.Status === "Active") {
                sap.m.MessageToast.show(this.i18nModel.getText("couponnotActive"));
                return;
            }

            // 3. Percentage discount

            var subtotal = 0;

            if (edit.UnitText === "Per Month") {
                var subtotal = edit.Price * (edit.TotalUnits || 1)
            } else if (edit.UnitText === "Per Year") {
                var subtotal = edit.Price * (edit.TotalUnits || 1)
            } else if (edit.UnitText === "Per Day") {
                var subtotal = edit.Price * (edit.TotalDays || 1)
            } else if (edit.UnitText === "Per Hour") {
                var subtotal = edit.Price * edit.TotalHour * edit.TotalDays
            }

            oCoupon.MinOrderValue = Number(oCoupon.MinOrderValue)
            if (oCoupon.MinOrderValue > subtotal) {
                sap.m.MessageToast.show("Coupon not Applicable for Below Minimum Value" + ' ' + oCoupon.MinOrderValue);
                return;
            }



            var discountAmount = 0;
            // Check discount type
            if (oCoupon.DiscountType === "Percentage") {
                discountAmount = (subtotal * Number(oCoupon.DiscountValue || 0)) / 100;
                if (oCoupon.UptoValue > 0 && discountAmount > oCoupon.UptoValue) {
                    discountAmount = Number(oCoupon.UptoValue);
                }
            } else if (oCoupon.DiscountType === "Fixed Amount") {
                discountAmount = Number(oCoupon.DiscountValue || 0);
            }

            this.getView().getModel("edit").setProperty("/CouponDiscount", discountAmount.toFixed(2));
            this.getView().getModel("edit").setProperty("/EndDate", edit.EndDate.split("-").reverse().join("/"));


        },


        oncancelCoupon: function () {
            var oCustomerData = this.getView().getModel("CustomerData").getData();
            var Bookingmodel = this.getView().getModel("Bookingmodel").getData();

            // Reset coupon code and discount
            oCustomerData.CouponCode = "";
            var originalRent = Number(oCustomerData.RentPrice || 0);
            var FacilitiPrice = Number(oCustomerData.TotalFacilityPrice || 0);

            var previousDiscount = Number(this.Discount || 0);
            // Recalculate subtotal (original subtotal before coupon)
            var subtotal = originalRent + FacilitiPrice - previousDiscount; // Assuming SubTotal originally was just RentPrice
            oCustomerData.SubTotal = subtotal;

            // Recalculate taxes
            var cgst = subtotal * 0.09;
            var sgst = subtotal * 0.09;
            var grandTotal = subtotal + cgst + sgst;

            // Update model values
            this.originalDis = oCustomerData.Discount
            oCustomerData.Discount = previousDiscount;
            oCustomerData.CGST = cgst;
            oCustomerData.SGST = sgst;
            oCustomerData.GrandTotal = grandTotal;

            // Refresh model and reset coupon flag
            this.getView().getModel("CustomerData").refresh(true);
            this.getView().getModel("VisibleModel").setProperty("/IsCouponApplied", false);
            this.getView().getModel("Bookingmodel").setProperty("/CouponCode", "");
            var oInput = this.getView().byId("couponInput");
            oInput.setValue("");
            oInput.setShowValueHelp(false);

        },

        onUploadDocumentFile: function () {
            if (!this.UD_Dialog) {
                var oView = this.getView();
                this.UD_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Upload", this);
                oView.addDependent(this.UD_Dialog);
            }


            var oCombo = this.getView().byId("idProofType") || sap.ui.getCore().byId("idProofType");
            if (oCombo) {
                oCombo.setSelectedKey("");
                oCombo.setValue("");
            }

            var oFileUploader = this.getView().byId("BT_id_FileUploader") || sap.ui.getCore().byId("BT_id_FileUploader");
            if (oFileUploader) {
                oFileUploader.clear();
            }

            this.UD_Dialog.open();
        },

        onCloseDialog: function () {
            this.UD_Dialog.close();
        },

        onCouponLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();
            // Show icon only if there is value
            oInput.setShowValueHelp(!!sValue);
        },
        oncancelFacilityCoupon: function (oEvent) {

            var oInput = oEvent.getSource();

            oInput.setValue("");
            oInput.setShowValueHelp(false);
            this.getView().getModel("edit").setProperty("/CouponDiscount", "");
        },
        onGSTBooking: function () {

            var oCustomerModel = this.getView().getModel("CustomerData")
            const CustData = this.getView().getModel("CustomerData").getData();

            if (!this.GST_Dialog) {
                var oView = this.getView();
                this.GST_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.GST", this);
                oView.addDependent(this.GST_Dialog);
            }
            sap.ui.getCore().byId("idBranchGSTNumber").setValueState("None").setValue(CustData.GSTIN || "");
            sap.ui.getCore().byId("idGSTNumber").setValueState("None").setValue(CustData.GSTNumber || "");

            sap.ui.getCore().byId("idGSTPercentage").setValueState("None").setValue(CustData.GSTValue || "");
            sap.ui.getCore().byId("idGSTType").setSelectedIndex(CustData.GSTType === "IGST" ? 0 : 1);

            if (sap.ui.getCore().byId("idBranchGSTNumber").getValue() === "") {
                sap.ui.getCore().byId("idBranchGSTNumber").setVisible(false);
            } else {
                sap.ui.getCore().byId("idBranchGSTNumber").setVisible(true);
            }

            this.GST_Dialog.open();
        },
        GST_onCancelButtonPress: function () {
            this.GST_Dialog.close();
        },
        onGSTInputLiveChange: function (oEvent) {
            const oInput = oEvent
                ? oEvent.getSource()
                : sap.ui.getCore().byId(this.getView().createId("idGSTNumber"));

            const sValue = oInput.getValue().trim().toUpperCase();
            oInput.setValue(sValue);

            const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

            // 🔹 If empty or incomplete → no error
            if (!GST_REGEX.test(sValue)) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("gstError"));
                return;
            }
            if (!sValue || sValue.length < 15) {
                oInput.setValueState("None");
                oInput.setValueStateText("");
                return;
            }

            // 🔹 Validate only when length is 15


            // 🔹 Correct GST → ValueState None
            oInput.setValueState("None");
            oInput.setValueStateText("");
        },
        GST_onsavebuttonpress: function () {
            var oView = sap.ui.getCore()

            if (
                utils.onNumber(oView.byId("idGSTPercentage"), "ID")
            ) {
                var oCustomerModel = this.getView().getModel("CustomerData")
                const CustData = this.getView().getModel("CustomerData").getData();
                const oInput = sap.ui.getCore().byId("idGSTNumber").getValue() || "";

                var Percentage = sap.ui.getCore().byId("idGSTPercentage").getValue();
                var oRadioGroup = sap.ui.getCore().byId("idGSTType");

                var iIndex = oRadioGroup.getSelectedIndex();
                var sValue = oRadioGroup.getButtons()[iIndex].getText();
                // const sGSTNumber = oInput.getValue().trim().toUpperCase();

                // const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
                // if (!GST_REGEX.test(sGSTNumber)) {
                //     oInput.setValueState("Error");
                //     oInput.setValueStateText(this.i18nModel.getText("gstError"));
                //     return;
                // }
                // oCustomerModel.setProperty("/GSTNumber", sGSTNumber);
                // oCustomerModel.refresh(true);

                //  var SubTotal =CustData.SubTotal
                //             var CGST = SubTotal * Percentage / 100

                //                   let TotalAmount;

                //                    if(sValue==="IGST"){
                //                     TotalAmount = SubTotal + CGST;
                //                 }else if(sValue==="CGST/SGST"){
                //                     TotalAmount = SubTotal + CGST + CGST;
                //                 }else{
                //                     TotalAmount = SubTotal
                //                 }
                //                 if (CustData.CouponCode || this.Code) {
                //                 var oCouponData = this.getView().getModel("CouponModel").getData();
                //                 var sEnteredCode = this.Code || CustData.CouponCode; // user entered code
                //                 var oMatchedCoupon = oCouponData.find(coupon => coupon.CouponCode === sEnteredCode);


                //                 if (oMatchedCoupon.MinOrderValue <= TotalAmount) {

                //                     if (oMatchedCoupon.DiscountType === "Percentage" && this.CouponDiscount || oMatchedCoupon.DiscountType === "Percentage"
                //                          && CustData.Discount) {
                //                         this.CouponDiscount = this.CouponDiscount || oMatchedCoupon.DiscountValue || "0"
                //                         CustData.Discount = TotalAmount * Number(this.CouponDiscount) / 100
                //                         if (oMatchedCoupon.UptoValue > 0 && CustData.Discount > oMatchedCoupon.UptoValue) {
                //                             CustData.Discount = Number(oMatchedCoupon.UptoValue);
                //                         }
                //                     } else {
                //                         CustData.Discount = this.CouponDiscount || CustData.Discount || "0.00";
                //                     }

                //                 }
                //             }




                //             if(sValue==="IGST"){
                //             oCustomerModel.setProperty("/IGST", CGST)
                //              oCustomerModel.setProperty("/GrandTotal", TotalAmount- Number(CustData.Discount) );
                //             oCustomerModel.setProperty("/DueAmount", TotalAmount - Number(CustData.Discount)- CustData.PaymentPaid);
                //               oCustomerModel.setProperty("/SGST", 0)
                //             oCustomerModel.setProperty("/CGST", 0)



                //             }else{
                //             oCustomerModel.setProperty("/IGST", 0)

                //              oCustomerModel.setProperty("/GrandTotal",TotalAmount- Number(CustData.Discount));
                //             oCustomerModel.setProperty("/DueAmount",TotalAmount- Number(CustData.Discount) - CustData.PaymentPaid);

                //             }

                //             oCustomerModel.setProperty("/SubTotal", SubTotal)
                //               oCustomerModel.setProperty("/GSTValue", Percentage)

                //             oCustomerModel.setProperty("/Discount", CustData.Discount)
                var Payload =
                {
                    "GSTType": sValue,
                    "GSTValue": Percentage,
                    "CustomerGSTIN": oInput ? oInput.trim().toUpperCase() : CustData.GSTNumber || ""
                }

                this.getBusyDialog()
                this.ajaxUpdateWithJQuery("HM_Booking", {
                    data: Payload,
                    filters: {
                        CustomerID: CustData.CustomerID
                    }
                })
                    .then(() => {

                        // Refresh models
                        this.AD_onSearch();
                        sap.m.MessageToast.show(this.i18nModel.getText("GST Details Saved Successfully"));

                        this.getView().getModel("VisibleModel").setProperty("/visible", false);
                        this.byId("idMonthYearSelect").setVisible(false);
                    })
                    .catch(err => {
                        sap.m.MessageToast.show(this.i18nModel.getText("errorSavingBooking"));
                        console.error(err);
                    });
                this.GST_Dialog.close();
            } else {
                sap.m.MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));
                return;
            }
        },
        onGSTTypeSelect: function (oEvent) {
            var oRadioGroup = oEvent.getSource();

            // Selected index (0 or 1)
            var iSelectedIndex = oRadioGroup.getSelectedIndex();

            // Get selected RadioButton text
            var sSelectedText = oRadioGroup.getButtons()[iSelectedIndex].getText();

            console.log(iSelectedIndex); // 0 or 1
            console.log(sSelectedText);  // "IGST" or "CGST / SGST"
        },

        onPercentagetLiveChange: function (oEvent) {
            utils.onNumber(oEvent.getSource(), "ID");
        },
       
        // Signin section

            onSignIn: async function () {
            var oLoginModel = this.getView().getModel("LoginModel");
            var vm = this.getView().getModel("LoginViewModel");
            const isOTP = vm.getProperty("/loginMode") === "otp";
            var oFragment = this._oLoginAlertDialog; // Correct reference to fragment dialog

            // fragment controls (use safe lookup)
            const ctrlEmailId = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInEmail");
            const ctrlPassword = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signinPassword");
            const ctrlOTP = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInOTP");

            var sUserid = ctrlEmailId && ctrlEmailId.getValue ? ctrlEmailId.getValue().trim() : "";

            var sPassword = ctrlPassword && ctrlPassword.getValue ? ctrlPassword.getValue() : "";
            const sOTP = ctrlOTP && ctrlOTP.getValue ? ctrlOTP.getValue().trim() : "";

            // --- VALIDATION ---
            // Always validate UserID and UserName
            if (!utils._LCvalidateEmail(ctrlEmailId, "ID")) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            // Validate password only when in password login mode
            if (!isOTP) {
                if (!utils._LCvalidatePassword(ctrlPassword)) {
                    // _LCvalidatePassword should set value state on ctrlPassword on failure,
                    // but we'll set explicitly to be safe
                    if (ctrlPassword) {
                        ctrlPassword.setValueState("Error");
                        ctrlPassword.setValueStateText(this.i18nModel.getText("enterValidPassword"));
                    }
                    MessageToast.show(this.i18nModel.getText("enterValidPassword"));
                    return;
                } else if (ctrlPassword) {
                    ctrlPassword.setValueState("None");
                }
            }

            try {
                BusyIndicator.show(0);
                let payload, oResponse;

                if (isOTP) {
                    // OTP-specific flow (keeps your original checks)
                    const vm = this.getView().getModel("LoginViewModel");
                    const showOTPField = vm.getProperty("/showOTPField");
                    const isOtpEntered = vm.getProperty("/isOtpEntered");
                    // OTP control may not exist if not rendered — guard it
                    const otpCtrl = ctrlOTP || { setValueState: function () { }, setValueStateText: function () { } };

                    // 1️⃣ OTP has NOT been generated
                    if (!showOTPField) {
                        MessageToast.show(this.i18nModel.getText("pleaseGenerateOTPFirst"));
                        return;
                    }

                    // 2️⃣ OTP was generated but user has not typed anything
                    if (!isOtpEntered) {
                        otpCtrl.setValueState("Error");
                        otpCtrl.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                        MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                        return;
                    }

                    // 3️⃣ Validate OTP format strictly
                    if (!/^\d{6}$/.test(sOTP)) {
                        otpCtrl.setValueState("Error");
                        otpCtrl.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                        MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                        return;
                    }

                    // 4️⃣ Backend verification
                    const isValid = await this._verifyOTPWithBackend(sOTP);
                    if (!isValid) {
                        MessageToast.show(this.i18nModel.getText("incorrectOTP"));
                        return;
                    }

                    // 5️⃣ Construct payload and continue login
                    payload = { EmailID: sUserid, OTP: sOTP };
                    oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);
                } else {
                    // -------------------------- PASSWORD MODE -------------------------
                    const passCtrl = ctrlPassword;

                    // Required (this was already validated above, but keep a runtime guard)
                    if (!sPassword) {
                        if (passCtrl) {
                            passCtrl.setValueState("Error");
                            passCtrl.setValueStateText(this.i18nModel.getText("passwordRequired"));
                        }
                        MessageToast.show(this.i18nModel.getText("passwordRequired"));
                        return;
                    }

                    // Format validation (already done above, but keep guard)
                    if (!utils._LCvalidatePassword(passCtrl)) {
                        if (passCtrl) {
                            passCtrl.setValueState("Error");
                            passCtrl.setValueStateText(this.i18nModel.getText("enterValidPassword"));
                        }
                        MessageToast.show(this.i18nModel.getText("enterValidPassword"));
                        return;
                    }

                    if (passCtrl) passCtrl.setValueState("None");

                    payload = {
                        EmailID: sUserid,
                        Password: btoa(sPassword)
                    };

                    oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);
                }

                const oMatchedUser = oResponse?.data?.[0];

               // Get models first
var oView = this.getView();
var model = oView.getModel("Bookingmodel");
var data = oView.getModel("CustomerData").getData();

// Show booking UI
oView.getModel("VisibleModel").setProperty("/visible", true);

// Restore booking values
model.setProperty("/BedTypeName", data.BedType);
model.setProperty("/CouponCode", data.CouponCode);
model.setProperty("/UnitText", data.PaymentType);
model.setProperty("/StartDate", data.StartDate);
model.setProperty("/EndDate", data.EndDate);
model.setProperty("/CustomerName", data.CustomerName);
model.setProperty("/DateOfBirth", data.DateOfBirth);
model.setProperty("/Gender", data.Gender);
model.setProperty("/CustomerEmail", data.CustomerEmail);
model.setProperty("/Country", data.Country);
model.setProperty("/State", data.State);
model.setProperty("/City", data.City);
model.setProperty("/STDCode", data.STDCode);
model.setProperty("/MobileNo", data.MobileNo);
model.setProperty("/Salutation", data.Salutation);
model.setProperty("/Address", data.Address);
            if (data.PaymentType === "Per Month") {
                model.setProperty("/UnitText", "monthly")
            } else if (data.PaymentType === "Per Day") {
                model.setProperty("/UnitText", "daily")
            } else if (data.PaymentType === "Per Year") {
                model.setProperty("/UnitText", "yearly")
            }

            if (data.PaymentType !== "daily" || data.PaymentType !== "Per Day") {
                this.byId("idMonthYearSelect").setVisible(false)
            }

            // Set Duration for XML binding
            if (data.PaymentType === "monthly" || data.PaymentType === "Per Month") {
                model.setProperty("/DurationUnit", data.Duration);
                this.byId("idMonthYearSelect").setVisible(true)

            } else if (data.PaymentType === "yearly" || data.PaymentType === "Per Year") {
                model.setProperty("/DurationUnit", data.Duration);
                this.byId("idMonthYearSelect").setVisible(true)

            }
            this.getView().getModel("VisibleModel").setProperty("/IsCouponApplied", false);


                if (!oMatchedUser || !oMatchedUser.EmailID) {
                    MessageToast.show(this.i18nModel.getText("invalidCredentials"));
                    return;
                }
                oLoginModel.setProperty("/isLoggedIn", true);
                this.getOwnerComponent()
                    .getRootControl()
                    .getController()
                    ._startSessionTracking();
                //BLOCK ADMIN LOGIN
                if (oMatchedUser.Role !== "Customer") {
                    MessageToast.show(this.i18nModel.getText("adminLoginNotAllowed"));
                    // Optional: clear sensitive inputs
                    if (ctrlPassword) ctrlPassword.setValue("");
                    if (ctrlOTP) ctrlOTP.setValue("");

                    return;
                }

                this._oLoggedInUser = oMatchedUser;
                // ---------- rest of your existing success logic (unchanged) ----------
                oLoginModel.setProperty("/EmployeeID", oMatchedUser.UserID);
                oLoginModel.setProperty("/UserID", oMatchedUser.UserID);
                oLoginModel.setProperty("/UserName", oMatchedUser.UserName);
                oLoginModel.setProperty("/EmailID", oMatchedUser.EmailID);
                oLoginModel.setProperty("/MobileNo", oMatchedUser.MobileNo);
                oLoginModel.setProperty("/Status", oMatchedUser.Status);
                oLoginModel.setProperty("/Role", oMatchedUser.Role);
                oLoginModel.setProperty("/DateOfBirth", oMatchedUser.DateOfBirth);
                oLoginModel.setProperty("/Gender", oMatchedUser.Gender);
                oLoginModel.setProperty("/Country", oMatchedUser.Country);
                oLoginModel.setProperty("/State", oMatchedUser.State);
                oLoginModel.setProperty("/City", oMatchedUser.City);
                oLoginModel.setProperty("/Address", oMatchedUser.Address);
                oLoginModel.setProperty("/STDCode", oMatchedUser.STDCode);
                oLoginModel.setProperty("/Salutation", oMatchedUser.Salutation);

                if (oMatchedUser.FileContent) {

                    oLoginModel.setProperty("/Photo", "data:image/png;base64," + oMatchedUser.FileContent);

                } else {

                    oLoginModel.setProperty("/Photo", "");

                }
                oLoginModel.setProperty("/Photo", oMatchedUser.FileContent || "");


                this.getOwnerComponent()
                    .getModel("UserModel")
                    ?.setData(oMatchedUser);

                // Clear input fields
                if (ctrlEmailId) ctrlEmailId.setValue("");
                if (ctrlPassword) ctrlPassword.setValue("");

                // Close dialog
               if (oFragment) oFragment.close();

// // Resume pending action after login
// if (this._pendingAction === "EditBooking") {
//     this._pendingAction = null;
//     this.onEditBooking();
// }

                // Fill Persons array and other UI updates (keep your logic)
                const oHostelModel = this.getView().getModel("HostelModel");
                const aPersons = oHostelModel.getProperty("/Persons") || [];

                const DOB = this.Formatter.DateFormat(oMatchedUser.DateOfBirth);

                aPersons.forEach((p, index) => {

                    // ---------- COMMON FIELDS (ALL PERSONS) ----------
                    p.CustomerEmail = oMatchedUser.EmailID || "";
                    p.MobileNo = oMatchedUser.MobileNo || "";
                    p.UserID = oMatchedUser.UserID || "";
                    p.Country = oMatchedUser.Country || "";
                    p.State = oMatchedUser.State || "";
                    p.City = oMatchedUser.City || "";
                    p.Address = oMatchedUser.Address || "";
                    p.STDCode = oMatchedUser.STDCode || "";

                    // ---------- FIRST PERSON ONLY ----------
                    if (index === 0) {
                        p.Salutation = oMatchedUser.Salutation || "";
                        p.FullName = oMatchedUser.EmployeeName || oMatchedUser.UserName || "";
                        p.DateOfBirth = DOB || "";
                        p.Gender = oMatchedUser.Gender || "";
                    }
                    // ---------- REST PERSONS ----------
                    else {
                        p.Salutation = "";
                        p.FullName = "";
                        p.DateOfBirth = "";
                        p.Gender = "";
                    }
                });

                // Auto-check the "Fill Yourself" checkbox
                const oCheck = sap.ui.getCore().byId(this.createId("IDSelfCheck_0"));
                const oUserModel = new JSONModel(oMatchedUser);
                sap.ui.getCore().setModel(oUserModel, "LoginModel");
                if (oCheck) {
                    oCheck.setSelected(true);
                    this._applyCountryStateCityForPersons();
                }
                oHostelModel.refresh(true);

            } catch (err) {
                MessageToast.show(err.message || "Invalid Credentials, Please try again");
            } finally {
                BusyIndicator.hide();
            }
        },
         onSubmitNewPassword: async function () {
            const oNew = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "newPass");
            const oConf = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "confPass");

            const pass = oNew.getValue().trim();
            const confirm = oConf.getValue().trim();

            // RESET state before validation
            oNew.setValueState("None");
            oConf.setValueState("None");

            // 1) Required check for New Password
            if (!pass) {
                oNew.setValueState("Error");
                oNew.setValueStateText(this.i18nModel.getText("passwordRequired"));
                MessageToast.show(this.i18nModel.getText("passwordRequired"));
                return;
            }

            // 2) Format rule check
            if (!utils._LCvalidatePassword(oNew)) {
                oNew.setValueState("Error");
                oNew.setValueStateText(this.i18nModel.getText("mustContainUppercaseLowercaseNumberSpecialCharacter"));
                return;
            }

            // 3) Required check for Confirm Password
            if (!confirm) {
                oConf.setValueState("Error");
                oConf.setValueStateText(this.i18nModel.getText("confirmPasswordRequired"));
                MessageToast.show(this.i18nModel.getText("confirmPasswordRequired"));
                return;
            }

            // 4) Match both
            if (pass !== confirm) {
                oConf.setValueState("Error");
                oConf.setValueStateText(this.i18nModel.getText("nopasswordmatch"));
                MessageToast.show(this.i18nModel.getText("nopasswordmatch"));
                return;
            }
            //  PASSED ALL VALIDATIONS → SUCCESS STATE
            oConf.setValueState("None");
            // oConf.setValueStateText("Passwords matched");
            BusyIndicator.show(0);
            try {
                const oFilters = this._oResetUser?.UserID
                    ? { UserID: this._oResetUser.UserID }
                    : { EmailID: this._oResetUser?.EmailID };
                await this.ajaxUpdateWithJQuery("HM_Login", {
                    data: { Password: btoa(pass) },
                    filters: oFilters
                });
                MessageBox.success("Password Updated Successfully", {
                    title: "Success",
                    onClose: () => {

                        // fully clean values
                        this._clearAllAuthFields?.();
                        this._clearForgotFlow?.();
                        // reset dialog title
                        sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "authDialog")
                            .getCustomHeader()
                            .getContentMiddle()[0]
                            .setText("Hostel Access Portal");

                        // switch flow back to signin
                        const vm = this.getView().getModel("LoginViewModel");
                        vm.setProperty("/authFlow", "signin");

                        // show login panel
                        vm.setProperty("/authFlow", "signin");
                        vm.setProperty("/forgotStep", 1);
                        vm.setProperty("/dialogTitle", "Hostel Access Portal");
                    }
                });

            } catch (err) {
                MessageToast.show(this.i18nModel.getText("passwordResetFailed"));
            }
            finally {
                BusyIndicator.hide();  // ALWAYS stop
                this._resetOtpState();
            }
        },

        _startOtpTimer: function () {
            const vm = this.getView().getModel("LoginViewModel");

            this._clearOtpTimer();

            const START = 20;

            vm.setProperty("/canResendOTP", false);
            vm.setProperty("/otpTimer", START);

            // 🔥 UPDATE TEXT IMMEDIATELY (important)
            vm.setProperty("/otpButtonText", `Resend OTP (${START}s)`);

            this._otpInterval = setInterval(() => {

                let remaining = vm.getProperty("/otpTimer");

                remaining--;

                if (remaining <= 0) {
                    this._clearOtpTimer();
                    vm.setProperty("/otpTimer", 0);
                    vm.setProperty("/otpButtonText", "Resend OTP");
                    vm.setProperty("/canResendOTP", true);
                    return;
                }

                vm.setProperty("/otpTimer", remaining);
                vm.setProperty("/otpButtonText", `Resend OTP (${remaining}s)`);

            }, 1000);
        },

        _clearOtpTimer: function () {
            if (this._otpInterval) {
                clearInterval(this._otpInterval);
                this._otpInterval = null;
            }
        },

        _resetOtpState: function () {
            const vm = this.getView().getModel("LoginViewModel");

            this._clearOtpTimer();

            vm.setProperty("/otpTimer", 0);
            vm.setProperty("/canResendOTP", true);
            vm.setProperty("/otpButtonText", "Send OTP");
            vm.setProperty("/showOTPField", false);
            vm.setProperty("/isOtpEntered", false);

            const otpCtrl = sap.ui.getCore().byId("signInOTP");
            otpCtrl?.setValue("");
            otpCtrl?.setEnabled(false);
            otpCtrl?.setValueState("None");
            clearInterval(this._otpInterval);
            this._otpInterval = null;


            vm.setProperty("/canResendOTP", true);
            vm.setProperty("/otpTimer", 0);
            vm.setProperty("/otpButtonText", "Send OTP");
        },

        onValidateUser: async function () {
            const oEmailCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpEmailId");
            const isValid =
                utils._LCvalidateEmail(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpEmailId"), "ID")


            if (!isValid) {
                MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));
                return;
            }

            const sEmail = oEmailCtrl.getValue().trim();

            BusyIndicator.show(0);

            try {
                const oResp = await this.ajaxCreateWithJQuery("HostelSendOTP", {
                    EmailID: sEmail,
                    Type: "OTP"
                });;

                if (oResp?.success) {
                    MessageToast.show(this.i18nModel.getText("oTPSentCheckyourEmail"));
                    // alert(oResp.OTP);

                    this._oResetUser = {
                        EmailID: sEmail
                    };
                    // ✅ Start resend cooldown
                    this._startOtpCooldown(20);


                    this.getView().getModel("LoginViewModel").setProperty("/forgotStep", 2);
                } else {
                    MessageToast.show(this.i18nModel.getText("noUserFoundwithGivenIDName"));
                }

            } catch (err) {
                const sMsg =
                    err?.responseJSON?.message ||
                    this.i18nModel.getText("forgotOtpSendFailed");
                sap.m.MessageToast.show(sMsg);
            } finally {
                BusyIndicator.hide();
            }
        },

        _verifyOTPWithBackend: async function (otp) {
            BusyIndicator.show(0);

            try {
                const oPayload = {
                    ...(this._oResetUser?.EmailID
                        ? { EmailID: this._oResetUser.EmailID }
                        : {
                            UserID: this._oResetUser?.UserID,
                            UserName: this._oResetUser?.UserName
                        }),
                    OTP: otp.trim()
                };

                // Call the BaseController Generic Read method
                const oResp = await this.ajaxReadWithJQuery("HM_Login", oPayload);

                return oResp?.success === true;

            } catch (err) {
                console.error("OTP Verify Error:", err);
                return false;

            } finally {
                BusyIndicator.hide();
            }
        },

        onPressOTP: async function () {
            const oEmailIDCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInEmail");

            const sUserId = oEmailIDCtrl.getValue().trim();
            // const sUserName = oUserNameCtrl.getValue().trim();

            // Validate inputs
            if (!utils._LCvalidateMandatoryField(oEmailIDCtrl, "ID")) {
                MessageToast.show(this.i18nModel.getText("enterValidUserIDUserName"));
                return;
            }

            const payload = {
                EmailID: sUserId,
                Type: "OTP"
            };

            BusyIndicator.show(0);

            try {
                const oResp = await this.ajaxCreateWithJQuery("HostelSendOTP", payload);

                if (oResp?.success) {

                    MessageToast.show(this.i18nModel.getText("oTPSentCheckyourEmail"));


                    this._oResetUser = { EmailID: sUserId, };

                    const vm = this.getView().getModel("LoginViewModel");

                    // Show OTP input
                    vm.setProperty("/showOTPField", true);

                    const oOtpCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInOTP");
                    oOtpCtrl.setEnabled(true);
                    oOtpCtrl.setValue("");
                    oOtpCtrl.setValueState("None");
                    oOtpCtrl.setValueStateText("");
                    oOtpCtrl.focus();

                    // 🔥 THIS WAS MISSING
                    this._startOtpTimer();     // ✅ start 20 sec resend cooldown

                }
                else {
                    MessageToast.show(this.i18nModel.getText("usernotFoundUnabletoSendOTP"));
                }

            } catch (err) {
                MessageToast.show(this.i18nModel.getText("invalidCredentialsPleasetryagain"));
            } finally {
                BusyIndicator.hide();
            }
        },

        onShowForgotUser: function () {
            this._showForgotSection("secForgotUser");
        },

        _onVerifyOTP: async function () {
            const vm = this.getView().getModel("LoginViewModel");
            const flow = vm.getProperty("/authFlow");

            // Resolve OTP control by flow
            const oOtpInput = (flow === "forgot")
                ? sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpOTP")
                : sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInOTP");

            const otp = oOtpInput.getValue().trim();

            // --- Basic validation ---
            if (!otp) {
                oOtpInput.setValueState(sap.ui.core.ValueState.Error);
                oOtpInput.setValueStateText(this.i18nModel.getText("pleaseEnterOTP"));
                MessageToast.show(this.i18nModel.getText("enterOTP"));
                return;
            }

            if (!/^\d{6}$/.test(otp)) {
                oOtpInput.setValueState(sap.ui.core.ValueState.Error);
                oOtpInput.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                MessageToast.show(this.i18nModel.getText("invalidOTP"));
                return;
            }

            // Clear any previous error state
            oOtpInput.setValueState(sap.ui.core.ValueState.None);
            oOtpInput.setValueStateText("");

            // --- Backend verification ---
            let isValid = false;

            try {
                isValid = await this._verifyOTPWithBackend(otp);
            } catch (e) {
                MessageToast.show(this.i18nModel.getText("oTPVerificationFailed"));
                return;
            }

            if (!isValid) {
                MessageToast.show(this.i18nModel.getText("incorrectOTP"));
                return;
            }

            //  OTP accepted: reset resend cooldown state
            this._resetOtpCooldown();

            //  Forgot Password Flow

            if (flow === "forgot") {
                vm.setProperty("/forgotStep", 3);
                return;
            }
            try {

                const resp = await this.ajaxReadWithJQuery("HM_Login", {
                    UserID: this._oResetUser?.UserID,
                    UserName: this._oResetUser?.UserName,
                    OTP: otp
                });

                MessageToast.show(this.i18nModel.getText("loginSuccessful"));
                this._setLoggedInUser(resp.data[0]);
                this._resetAllAuthFields();
                this._oSignDialog.close();

            } catch (e) {
                MessageToast.show(this.i18nModel.getText("loginFailed"));
                console.error("OTP login error:", e);

            }
        },
         _startOtpCooldown: function (iSeconds = 20) {
            const vm = this.getView().getModel("LoginViewModel");
            let remaining = iSeconds;

            vm.setProperty("/canResendOTP", false);
            vm.setProperty("/otpButtonText", `Resend OTP in ${remaining}s`);

            if (this._otpInterval) {
                clearInterval(this._otpInterval);
                this._otpInterval = null;
            }

            this._otpInterval = setInterval(() => {
                remaining--;

                if (remaining <= 0) {
                    clearInterval(this._otpInterval);
                    this._otpInterval = null;

                    vm.setProperty("/canResendOTP", true);
                    vm.setProperty("/otpButtonText", "Resend OTP");
                    return;
                }
                vm.setProperty("/otpButtonText", `Resend OTP in ${remaining}s`);

            }, 1000);
        },

        _resetOtpCooldown: function () {
            const vm = this.getView().getModel("LoginViewModel");

            if (this._otpInterval) {
                clearInterval(this._otpInterval);
                this._otpInterval = null;
            }

            vm.setProperty("/otpButtonText", "Send OTP");
            vm.setProperty("/canResendOTP", false);
        },
         _clearAllAuthFields: function () {
            const ids = [
                "signInuserid", "signInusername", "signinPassword",
                "fpEmailId", "fpOTP",
                "newPass", "confPass", "loginOTP"
            ];
            ids.forEach(id => {
                const c = sap.ui.getCore().byId(id);
                if (c) { c.setValue(""); c.setValueState("None"); }
            });
            this._storedLoginCreds = null;
            this._oResetUser = null;
        },

        onBackToLogin: function () {
            // Clean auth data & any internal flags
            this._clearAllAuthFields();

            // Reset only values (not visibility/enabled state)

            sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpEmailId").setValue("");

            sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpOTP").setValue("");
            sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "newPass").setValue("");
            sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "confPass").setValue("");
            // Update flow using ViewModel
            const vm = this.getView().getModel("LoginViewModel");
            vm.setProperty("/loginMode", "password");
            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/forgotStep", 1);

            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/forgotStep", 1);
            vm.setProperty("/dialogTitle", "Hostel Access Portal");
            this._resetOtpState();

        },
         onForgotPassword: function () {
            const vm = this.getView().getModel("LoginViewModel");

            vm.setProperty("/authFlow", "forgot");
            vm.setProperty("/forgotStep", 1); // safe, runtime only
            vm.setProperty("/dialogTitle", "Reset Password"); //
        },

        SM_onTogglePasswordVisibility: function (oEvent) {
            const oInput = oEvent.getSource();
            const isPassword = oInput.getType() === "Password";

            oInput.setType(isPassword ? "Text" : "Password");
            oInput.setValueHelpIconSrc(isPassword ? "sap-icon://hide" : "sap-icon://show");
        },

        onUserlivechange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        //onsignup
        onSignUp: async function () {
            const fragId = this.createId("LoginAlertDialog");
            const C = (id) => sap.ui.core.Fragment.byId(fragId, id);
            var oCustomerData = this.getView().getModel("CustomerData").getData();

            const oModel = this.getView().getModel("LoginMode");
            const data = oModel.getData();
            const std = (C("signUpSTD").getValue() || "").trim();

            // ---- VALIDATION GATE ----
            const isValid = (
                utils._LCstrictValidationSelect(C("signUpSalutation")) &&
                utils._LCvalidateName(C("signUpName"), "ID") &&
                this.onChangeDOB(C("signUpDOB")) &&
                utils._LCstrictValidationSelect(C("signUpGender")) &&
                utils._LCvalidateEmail(C("signUpEmail"), "ID") &&
                utils._LCvalidateMandatoryField(C("signUpCountry"), "ID") &&
                utils._LCvalidateMandatoryField(C("signUpState"), "ID") &&
                utils._LCvalidateMandatoryField(C("signUpCity"), "ID") &&
                utils._LCvalidateMandatoryField(C("signUpSTD"), "ID") &&
                utils._LCvalidateISDmobile(C("signUpPhone"), std) &&
                utils._LCvalidateAddress(C("signUpAddress")) &&
                utils._LCvalidatePassword(C("signUpPassword")) &&
                this.FSM_onConfirm({ getSource: () => C("signUpConfirmPassword") })
            );

            if (!isValid) {
                MessageToast.show(this.i18nModel.getText("MSfillallfields"));
                return;
            }
            // ---- PAYLOAD BUILD ----
            // Server timestamp in required format
            const TimeDate = new Date().toISOString().replace("T", " ").slice(0, 19);
            const payload = {
                data: {
                    Salutation: C("signUpSalutation").getSelectedKey(),
                    UserName: data.fullname.trim(),
                    Role: "Customer",
                    Type: "Customer",
                    EmailID: data.Email.trim(),
                    Password: btoa(data.password),
                    STDCode: data.STDCode || std,
                    MobileNo: data.Mobileno,
                    Status: "Active",
                    TimeDate,
                    DateOfBirth: data.DateOfBirth || "",
                    Gender: C("signUpGender").getSelectedKey(),

                    Country: data.Country,
                    State: data.State,
                    City: data.City,
                    Address: data.Address.trim(),
                    CustomerId:oCustomerData.CustomerId
                }
            };

            BusyIndicator.show(0);
            try {
                const oResp = await this.ajaxCreateWithJQuery("HM_Login", payload);

                if (!oResp || oResp.success !== true) {
                    const sFailMsg =
                        oResp?.message ||
                        this.i18nModel.getText("registrationFailedPleasetryagain");

                    sap.m.MessageBox.error(sFailMsg, {
                        title: "Registration Failed"
                    });
                    return;
                }
                const sUsername = data.fullname.trim();
                const Salutation = C("signUpSalutation").getSelectedItem().getText();
                const sSuccessMsg = "Thank you " + Salutation + " " + sUsername + ", for registration.\n\n" +
                    "Your account has been created successfully. You will receive an email shortly with your login credentials.";


                MessageBox.success(sSuccessMsg, {
                    title: "Success",
                    onClose: () => {

                        // Reset login flow
                        const vm = this.getView().getModel("LoginViewModel");
                        vm.setProperty("/authFlow", "signin");
                        vm.setProperty("/loginMode", "password");
                        vm.setProperty("/showOTPField", false);
                        vm.setProperty("/isOtpEntered", false);
                        vm.setProperty("/dialogTitle", "Hostel Access Portal");
                        vm.setProperty("/forgotStep", 1);

                        // Clear form fields + ui states
                        this._resetAllAuthFields?.();
                        this._clearAllAuthFields?.();

                        // Reset Sign-Up model
                        oModel.setData({
                            fullname: "",
                            Email: "",
                            Mobileno: "",
                            password: "",
                            comfirmpass: "",
                            STDCode: "",
                            Address: "",
                            Country: "",
                            State: "",
                            City: "",
                            Gender: "",
                            DateOfBirth: ""
                        });

                        // Switch UI back to Sign-In
                        sap.ui.getCore().byId("signInPanel")?.setVisible(true);
                        sap.ui.getCore().byId("signUpPanel")?.setVisible(false);

                        // Reset login fields
                        sap.ui.getCore().byId("signinPassword")?.setEnabled(true).setValue("");
                        sap.ui.getCore().byId("signInOTP")?.setEnabled(false).setValue("");
                        sap.ui.getCore().byId("btnSignInSendOTP")?.setVisible(false);
                        sap.ui.getCore().byId("signInuserid")?.setValue("");
                        sap.ui.getCore().byId("signInusername")?.setValue("");

                        this._oSignDialog?.close();

                        setTimeout(() => {
                            this._oSignDialog?.open();
                        }, 200);
                    }
                });

            } catch (err) {

                let sMsg = "Registration failed! Please try again.";

                // ---- Extract backend error message safely ----
                if (err?.responseJSON?.message) {
                    sMsg = err.responseJSON.message;
                }
                else if (typeof err?.responseText === "string") {
                    try {
                        const oErr = JSON.parse(err.responseText);
                        if (oErr?.message) {
                            sMsg = oErr.message;
                        }
                    } catch (e) {
                        // ignore JSON parse errors
                    }
                }

                MessageBox.error(sMsg, {
                    title: "Registration Failed"
                });

                console.error("SignUp Error:", err);

            } finally {
                BusyIndicator.hide();
            }
        },
         onChangeState: function (oEvent) {
            const oState = oEvent.getSource();
            const oModel = this.getView().getModel("LoginMode");

            // sanitize free typing
            oState.setValue(oState.getValue().replace(/[^a-zA-Z\s]/g, ""));

            utils._LCvalidateMandatoryField(oEvent);

            // ✅ ALWAYS WRITE TO MODEL
            const sStateText =
                oState.getSelectedItem()?.getText() ||
                oState.getValue() ||
                "";

            oModel.setProperty("/State", sStateText);

            // reset city whenever state changes
            const oCity = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpCity");
            oModel.setProperty("/City", "");
            oCity.setValue("").setSelectedKey("");

            oCity.getBinding("items")?.filter([
                new Filter("cityName", "EQ", "__NONE__")
            ]);

            // release cities only if country is valid
            const oCountry = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpCountry");
            const sCountryCode =
                oCountry.getSelectedItem()?.getAdditionalText()?.trim();

            if (!sCountryCode || !sStateText) return;

            oCity.getBinding("items")?.filter([
                new Filter("stateName", "EQ", sStateText),
                new Filter("countryCode", "EQ", sCountryCode)
            ]);
        },

        onChangeCity: function (oEvent) {
            const oCity = oEvent.getSource();
            const oModel = this.getView().getModel("LoginMode");

            // sanitize manual typing
            oCity.setValue(oCity.getValue().replace(/[^a-zA-Z\s]/g, ""));

            const oCountry = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpCountry");
            const oState = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpState");

            const hasCountry = !!oCountry.getSelectedItem();
            const hasState = !!oState.getSelectedItem() || !!oState.getValue();

            // parent missing → block
            if (!hasCountry || !hasState) {

                oCity.setValue("");
                oCity.setSelectedKey("");
                oCity.getBinding("items")?.filter([
                    new Filter("cityName", "EQ", "__NONE__")
                ]);

                oCity.setValueState("None");
                return;
            }

            utils._LCvalidateMandatoryField(oEvent);

            // ✅ ALWAYS WRITE TO MODEL
            const sCityText =
                oCity.getSelectedItem()?.getText() ||
                oCity.getValue() ||
                "";

            oModel.setProperty("/City", sCityText);
        },

        FSM_onConfirm: function (oEvent) {
            const oInput = oEvent?.getSource();
            if (!oInput) return false;

            const confirm = (oInput.getValue() || "").trim();
            const pass = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpPassword").getValue().trim();

            // Required
            if (!confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("confirmPasswordRequired"));
                return false;
            }

            // Compare
            if (pass !== confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("nopasswordmatch"));
                return false;
            }

            // Success
            oInput.setValueState("None");
            return true;
        },

        onChangeSalutation: function (oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();
            const oGender = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpGender");

            // Reset gender
            oGender.setSelectedKey("");
            oGender.setEnabled(true);

            if (sKey === "Mr.") {
                oGender.setSelectedKey("Male");
                oGender.setEnabled(false);
            }
            else if (sKey === "Ms." || sKey === "Mrs.") {
                oGender.setSelectedKey("Female");
                oGender.setEnabled(false);
            }
            utils._LCstrictValidationSelect(oSalutation);
        },

        onChangeDOB: function (oEventOrControl) {
            const oDP =
                (typeof oEventOrControl.getSource === "function")
                    ? oEventOrControl.getSource()
                    : oEventOrControl;

            if (!oDP) return false;

            const v = oDP.getDateValue();

            if (!v) {
                oDP.setValueState("Error");
                oDP.setValueStateText(this.i18nModel.getText("dateofBirthisRequired"));
                return false;
            }

            // Age validation (10–100)
            const today = new Date();
            let age = today.getFullYear() - v.getFullYear();
            const m = today.getMonth() - v.getMonth();

            if (m < 0 || (m === 0 && today.getDate() < v.getDate())) age--;

            if (age < 10 || age > 100) {
                oDP.setValueState("Error");
                oDP.setValueStateText(this.i18nModel.getText("agemustbebetween10and100years"));
                return false;
            }

            // ✅ Valid DOB
            oDP.setValueState("None");

            // 🔥 push to model (LoginMode>/DateOfBirth) in yyyy-MM-dd
            const sDob =
                v.getFullYear() + "-" +
                String(v.getMonth() + 1).padStart(2, "0") + "-" +
                String(v.getDate()).padStart(2, "0");

            const oModel = this.getView().getModel("LoginMode");
            oModel.setProperty("/DateOfBirth", sDob);

            return true;
        },
        
         onCityChange: function (oEvent) {
            const oCity = oEvent.getSource();

            // Sanitize manual typing
            oCity.setValue(oCity.getValue().replace(/[^a-zA-Z\s]/g, ""));

            const oCountry = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpCountry");
            const oState = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpState");

            const hasCountry = !!oCountry.getSelectedItem();
            const hasState = !!oState.getSelectedItem();

            // ❗ User typed a value without valid parents → reset
            if (!hasCountry || !hasState) {
                oCity.setValue("");
                oCity.setSelectedKey("");

                oCity.getBinding("items")?.filter([
                    new Filter("cityName", "EQ", "__NONE__")
                ]);

                oCity.setValueState("None");
                return;
            }

            // Normal mandatory check when parents are valid
            utils._LCvalidateMandatoryField(oEvent);

            // 🔥 PUSH CITY TO MODEL when valid
            const oModel = this.getView().getModel("LoginMode");
            const sCityText = oCity.getSelectedItem()?.getText() || oCity.getValue() || "";
            oModel.setProperty("/City", sCityText);
        },

        onChangeGender: function (oEvent) {
            utils._LCstrictValidationSelect(oEvent.getSource());
        },

        onMobileLivechnage: function (oEvent) {
            const oInput = oEvent.getSource();

            // Digits only
            let val = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(val);

            const stdRaw = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpSTD").getValue() || "";
            const std = stdRaw.replace(/\s+/g, "").startsWith("+")
                ? stdRaw.replace(/\s+/g, "")
                : "+" + stdRaw.replace(/\s+/g, "");

            // ✅ NEW RULE:
            // Don't show error for empty untouched field
            if (val.length === 0) {
                oInput.setValueState("None");
                return;
            }

            // If STD not chosen yet
            if (!std) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("selectISDCodeFirst"));
                return;
            }

            // 🔥 STRICT validation while typing
            const isValid = utils._LCvalidateISDmobile(oInput, std);

            if (!isValid) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("mobileNoValueState"));
            } else {
                oInput.setValueState("None");
            }
        },

        onSTDChange: function () {
            const oSTD = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpSTD");
            const oMobile = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpPhone");
            const std = oSTD.getValue();

            oMobile.setValue("");

            // Dynamic maxLength
            if (std === "+91") {
                oMobile.setMaxLength(10);
            } else {
                oMobile.setMaxLength(18);
            }
        },

        onAddressChange: function () {
            utils._LCvalidateAddress(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpAddress"));
        },

        onChangeCountry: function (oEvent) {
            const oCountry = oEvent.getSource();
            oCountry.setValue(oCountry.getValue().replace(/[^a-zA-Z\s]/g, ""));

            utils._LCvalidateMandatoryField(oEvent);

            const oModel = this.getView().getModel("LoginMode");
            const oState = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpState");
            const oCity = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpCity");
            const oSTD = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpSTD");

            // Model reset
            ["State", "City", "Mobileno", "STDCode"].forEach(p =>
                oModel.setProperty("/" + p, "")
            );

            // UI reset
            oState.setValue("").setSelectedKey("");
            oCity.setValue("").setSelectedKey("");
            oSTD.setValue("");

            // Block all child lists until prerequisites
            oState.getBinding("items")?.filter([
                new Filter("stateName", "EQ", "__NONE__")
            ]);
            oCity.getBinding("items")?.filter([
                new Filter("cityName", "EQ", "__NONE__")
            ]);

            const oItem = oCountry.getSelectedItem();
            if (!oItem) return;

            const sCountry = oItem.getText();
            const sCountryCode = oItem.getAdditionalText()?.trim();

            oModel.setProperty("/Country", sCountry);

            // STD handling
            const countries = this.getOwnerComponent()
                .getModel("CountryModel")
                .getData();

            const data = countries.find(c => c.countryName === sCountry);
            if (data?.stdCode) {
                oModel.setProperty("/STDCode", data.stdCode);
                oSTD.setValue(data.stdCode);
                this.onSTDChange();
            }

            // 🚀 RELEASE states only after country valid
            if (sCountryCode) {
                oState.getBinding("items")?.filter([
                    new Filter(
                        "countryCode",
                        FilterOperator.EQ,
                        sCountryCode
                    )
                ]);
            }
        },

        _LCvalidateName: function (oEvent) {
            utils._LCvalidateName(oEvent);
        },

        onSwitchToSignIn: function () {
            const vm = this.getView().getModel("LoginViewModel");
            // -------------------------
            // FLOW RESET
            // -------------------------
            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/loginMode", "password");
            vm.setProperty("/forgotStep", 0);
            vm.setProperty("/dialogTitle", "Hostel Access Portal");

            // -------------------------
            // RESET OTP + TIMER
            // -------------------------
            this._resetOtpState();

            // -------------------------
            // RESET SIGN-IN FIELDS
            // -------------------------
            ["signInuserid", "signInusername", "signinPassword", "signInOTP"]
                .forEach(id => {
                    const c = sap.ui.getCore().byId(id);
                    if (c) {
                        c.setValue("");
                        c.setValueState("None");
                        c.setValueStateText("");
                    }
                });

            sap.ui.getCore().byId("signinPassword")?.setEnabled(true);
            sap.ui.getCore().byId("signInOTP")?.setEnabled(false);
            sap.ui.getCore().byId("btnSignInSendOTP")?.setVisible(false);

            // -------------------------
            // RESET FORGOT FIELDS
            // -------------------------
            ["fpEmailId", "fpOTP", "newPass", "confPass"]
                .forEach(id => {
                    const c = sap.ui.getCore().byId(id);
                    if (c) {
                        c.setValue("");
                        c.setValueState("None");
                        c.setValueStateText("");
                    }
                });

            // -------------------------
            // 🚫 DISABLE FORGOT FORM
            // -------------------------
            ["fpEmailId", "fpOTP", "newPass", "confPass"]
                .forEach(id => {
                    const c = sap.ui.getCore().byId(id);
                    if (c) c.setEnabled(false);
                });

            // -------------------------
            // PANELS
            // -------------------------
            sap.ui.getCore().byId("signInPanel")?.setVisible(true);
            sap.ui.getCore().byId("signUpPanel")?.setVisible(false);

            // -------------------------
            // HEADER
            // -------------------------
            sap.ui.getCore().byId("authDialog")
                ?.getCustomHeader()
                ?.getContentMiddle()[0]
                ?.setText("Hostel Access Portal");
        },

        onSwitchToSignUp: function () {
            const vm = this.getView().getModel("LoginViewModel");

            const oSignInPanel = sap.ui.getCore().byId("signInPanel");
            const oSignUpPanel = sap.ui.getCore().byId("signUpPanel");

            oSignInPanel?.setVisible(false);
            oSignUpPanel?.setVisible(true);

            vm.setProperty("/authFlow", "signup");
            vm.setProperty("/dialogTitle", "Hostel Access Portal");
            // Set min and max dates for the Date of Birth picker
            const oDOBpicker = sap.ui.getCore().byId("signUpDOB");
            if (oDOBpicker) {
                const oToday = new Date();

                // Max date: 10 years ago from today
                const oMaxDate = new Date(oToday);
                oDOBpicker.setMaxDate(oMaxDate);

                // Min date: 100 years ago from today
                const oMinDate = new Date(2000, 0, 1);
                oDOBpicker.setMinDate(oMinDate);
            }
            this._resetOtpState();
            this._addPasswordGenerateIcon();
        },

        onEmailliveChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },
        onSigninPasswordLive: function (oEvent) {
            utils._LCvalidatePassword(oEvent);
        },

        SM_onTogglePasswordVisibility: function (oEvent) {
            const oInput = oEvent.getSource();
            const isPassword = oInput.getType() === "Password";

            oInput.setType(isPassword ? "Text" : "Password");
            oInput.setValueHelpIconSrc(isPassword ? "sap-icon://hide" : "sap-icon://show");
        },
          _getLoginFragmentControl: function (localId) {
            // 1) If you stored the fragment instance (best practice), use it
            if (this._oLoginFragment && typeof this._oLoginFragment.byId === "function") {
                const c = this._oLoginFragment.byId(localId);
                if (c) { console.debug("found via this._oLoginFragment.byId", localId); return c; }
            }

            // 2) If you stored dialog instance but not fragment, try to infer prefix from dialog id
            if (this._oLoginAlertDialog && typeof this._oLoginAlertDialog.getId === "function") {
                try {
                    // example dialog id: "__xmlview1--LoginAlertDialog--authDialog"
                    const dialogId = this._oLoginAlertDialog.getId();
                    // get the xmlview prefix (everything before "--LoginAlertDialog--authDialog")
                    const parts = dialogId.split("--");
                    if (parts.length >= 2) {
                        // build prefix: first segment + "--LoginAlertDialog--"
                        const prefix = parts[0] + "--LoginAlertDialog--";
                        const full = prefix + localId; // __xmlview1--LoginAlertDialog--passwordStrengthText
                        const c = sap.ui.getCore().byId(full);
                        if (c) { console.debug("found via dialog prefix", full); return c; }
                    }
                } catch (e) { /* ignore */ }
            }

            // 3) Try Fragment.byId with raw fragment id (common)
            try {
                const c = sap.ui.core.Fragment.byId("LoginAlertDialog", localId);
                if (c) { console.debug("found via Fragment.byId('LoginAlertDialog',...)", localId); return c; }
            } catch (e) { /* ignore */ }

            // 4) Try Fragment.byId with view-scoped id (if you used this.createId when creating fragment)
            try {
                if (this.createId) {
                    const fragId = this.createId("LoginAlertDialog");
                    const c = sap.ui.core.Fragment.byId(fragId, localId);
                    if (c) { console.debug("found via Fragment.byId(this.createId('LoginAlertDialog'),...)", fragId, localId); return c; }
                }
            } catch (e) { /* ignore */ }

            // 5) Try view.byId (if fragment controls were placed inside view aggregation)
            try {
                const c = this.getView().byId(localId);
                if (c) { console.debug("found via view.byId", localId); return c; }
            } catch (e) { /* ignore */ }

            // 6) Last resort: global core lookup for any control that endsWith the localId
            const all = sap.ui.getCore().mElements; // internal map, useful for debugging only
            for (const id in all) {
                if (id.endsWith("--" + localId) || id.endsWith("-" + localId) || id === localId) {
                    const c = sap.ui.getCore().byId(id);
                    if (c) { console.debug("found via core fallback", id); return c; }
                }
            }

            console.warn("Could not find login fragment control:", localId);
            return null;
        },

        SM_onChnageSetAndConfirm: function (oEvent) {
            const oInput = oEvent.getSource();
            if (!oInput) { return; }

            // get the unprefixed id (local id inside fragment)
            const fullId = oInput.getId() || "";
            const localId = fullId.split("--").pop();

            let oStrengthText = null;
            if (localId === "signUpPassword") {
                oStrengthText = this._getLoginFragmentControl("passwordStrengthText");
            } else if (localId === "newPass") {
                oStrengthText = this._getLoginFragmentControl("fpPasswordStrengthText");
            }

            // Pass the actual input control and the strength text (may be null)
            utils._LCvalidatePassword(oInput, oStrengthText);
        },

        SM_onGenerateForgotPassword: function () {
            var oPwdInput = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "newPass");
            var oStrength = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpPasswordStrengthText");

            if (!oPwdInput) {
                console.error("❌ newPass input not found");
                return;
            }

            //  Only generate + validate (NO copying here)
            var pwd = utils._LCgenerateStrongPassword();
            oPwdInput.setValue(pwd);
            utils._LCvalidatePassword(oPwdInput, oStrength);
        }
        ,
         onSelectLoginMode: function (e) {
            const vm = this.getView().getModel("LoginViewModel");
            const mode = e.getSource().getText().toLowerCase();

            vm.setProperty("/loginMode", mode);
            vm.setProperty("/showOTPField", false);
            vm.setProperty("/isOtpEntered", false);

            // ✅ guarantee button has text
            if (mode === "otp") {
                vm.setProperty("/otpButtonText", "Send OTP");
            }

            const otpCtrl = sap.ui.core.Fragment.byId(
                this.createId("LoginAlertDialog"),
                "signInOTP"
            );
            if (otpCtrl) {
                otpCtrl.setValue("");
                otpCtrl.setEnabled(false);
            }

            const passCtrl = sap.ui.core.Fragment.byId(
                this.createId("LoginAlertDialog"),
                "signinPassword"
            );
            if (passCtrl) {
                passCtrl.setValue("");
                passCtrl.setValueState("None");
            }
        },
        
        onDialogClose: function () {
            this._oLoginAlertDialog.close()
        },
         onLoginOtpLive: function (e) {
            const vm = this.getView().getModel("LoginViewModel");
            const input = e.getSource();

            // allow only digits and enforce 6 max
            let val = e.getParameter("value").replace(/\D/g, "");
            if (val.length > 6) val = val.slice(0, 6);

            input.setValue(val);

            const isValid = val.length === 6;
            vm.setProperty("/isOtpEntered", isValid);

            if (val.length === 0) {
                input.setValueState("None");
            } else if (!isValid) {
                input.setValueState("Error");
                input.setValueStateText(this.i18nModel.getText("entervaliddigitOTP"));
            } else {
                input.setValueState("None");
            }
        },
         _addPasswordGenerateIcon: function () {

            const aInputs = [
                sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpPassword"),
                sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "newPass")
            ];

            aInputs.forEach((oInput) => {

                if (!oInput || oInput._hasCopyIcon) return;

                oInput.addEndIcon({
                    src: "sap-icon://copy",
                    tooltip: "Copy password",
                    press: this.SM_onCopyPassword.bind(this)
                });

                oInput._hasCopyIcon = true;
            });
        },

          SM_onCopyPassword: function (oEvent) {
            const oIcon = oEvent.getSource();
            const oInput = oIcon.getParent();

            if (!oInput || !oInput.getValue) return;

            const pwd = oInput.getValue();

            if (!pwd) {
                MessageToast.show(this.i18nModel.getText("noPasswordCopy"));
                return;
            }

            navigator.clipboard.writeText(pwd)
                .then(() => {
                    MessageToast.show(this.i18nModel.getText("passwordCopied"));
                })
                .catch(() => {

                    try {
                        const oTemp = document.createElement("textarea");
                        oTemp.value = pwd;
                        document.body.appendChild(oTemp);
                        oTemp.select();
                        document.execCommand("copy");
                        document.body.removeChild(oTemp);

                        MessageToast.show(this.i18nModel.getText("passwordCopied"));

                    } catch (err) {
                        MessageToast.show(this.i18nModel.getText("copyFailed"));
                    }
                });
        },




    });
});