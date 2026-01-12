sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../utils/validation"
], function (BaseController, Formatter, JSONModel, MessageBox, utils) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.AdminDetails", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteAdminDetails").attachMatched(this._onRouteMatched, this);
        },
        
        _onRouteMatched: async function (oEvent) {
            this._ViewDatePickersReadOnly(["Ad_id_editStartDate", "editEndDate", "AD_id_Date"], this.getView());
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            var model = new JSONModel(this.getOwnerComponent().getModel("LoginModel").getData());
            this.getView().setModel(model, "LoginModel");
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
                TotalDays: ""

            });
            this.getView().setModel(model, "edit")

            var model = new JSONModel({
                StartDate: "",
                EndDate: "",
                UnitText: "daily", // daily | monthly | yearly
                TotalMonths: 1,
                TotalYears: 1,
                BedTypeName: ""
            });
            this.getView().setModel(model, "Bookingmodel");

            var model = new JSONModel({
                visible: false,
                GSt: false,
                IsCouponApplied: false

            });
            this.getView().setModel(model, "VisibleModel")
            this._sLoggedUserID = "";
            this.getView().setModel(new sap.ui.model.json.JSONModel({
                editable: true,
            }), "visiablityPlay");

            var sPath = oEvent.getParameter("arguments").sPath;
            this.decodedPath = decodeURIComponent(decodeURIComponent(sPath));
            this.valuestate()
            await this.OnRoom();
            this.AD_onSearch()

            //    const oResponse = await this.ajaxReadWithJQuery("HM_Branch", {});
            //                 const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);

            //                 var Data=aBranches.find((item)=>{
            //                     var sBranchCode=this.getView().getModel("CustomerData").getData().BranchCode
            //                     return item.BranchID===sBranchCode
            //              })
            //              if(Data.Country==="India"){
            //                  this.getView().getModel("VisibleModel").setProperty("/GSt",true)
            //              }else{
            //                     this.getView().getModel("VisibleModel").setProperty("/GSt",false)
            //              }

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
            this.ajaxReadWithJQuery("HM_Rooms", "").then((oData) => {
                var aRooms = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
                var model = new sap.ui.model.json.JSONModel(aRooms);
                this.getView().setModel(model, "Availablebeds")

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

        Ck_onsavebuttonpress:async function () {
            // Get edited data from Bookingmodel
            var oBookingData = this.getView().getModel("Bookingmodel").getData();

            // Update CustomerData model with edited dates
            var oCustomerModel = this.getView().getModel("CustomerData").getData();
            // Refresh model to update UI bindings

            var Payload = {
                "Booking": [{
                    "StartDate": oBookingData.StartDate.split('/').reverse().join('-'),
                    "EndDate": oBookingData.EndDate.split('/').reverse().join('-'),
                    "Status": "Completed"
                }]
            };

            // Send payload
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

        Facilitysearch: async function (sBranchCode) {
            const oData = await this.ajaxReadWithJQuery("HM_ExtraFacilities", {
                BranchCode: sBranchCode
            });

            const aFacilities = Array.isArray(oData.data.data) ? oData.data.data : [oData.data.data];

            const oModel = new sap.ui.model.json.JSONModel(aFacilities);
            this.getView().setModel(oModel, "Facilities");

            // very important: return data so main function waits
            return aFacilities;
        },

        onNavBack: function () {
            const oLoginModel = this.getView().getModel("LoginModel");
            const sRole = oLoginModel?.getProperty("/Role") || "";
            const sEmpID = oLoginModel?.getProperty("/EmployeeID") || "";
            if (sRole === "Customer") {
                this._sLoggedUserID = sEmpID;
                const oUIModel = this.getOwnerComponent().getModel("UIModel");
                oUIModel.setProperty("/isLoggedIn", true);
                this.getOwnerComponent().getRouter().navTo("RouteHostel");
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteAdmin");
            }
            this.getView().getModel("CustomerData").setData({});
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
                sap.ui.core.BusyIndicator.show(0);
                const filter = {
                    CustomerID: this.decodedPath
                };
                const response = await this.ajaxReadWithJQuery("HM_Customer", filter);
                const oCustomer = response?.Customers || response?.value?.[0] || {};
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


                    StartDate: this.Formatter.DateFormat(oCustomer.Bookings?.[0]?.StartDate || ""),
                    minStartDate: new Date(oCustomer.Bookings?.[0]?.StartDate || ""),

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
                        Duration = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
                        DurationUnit = "days";


                    } else if (paymentType === "per month") {
                        const years = end.getFullYear() - start.getFullYear();
                        const months = end.getMonth() - start.getMonth();
                        let totalMonths = years * 12 + months;

                        // If end day >= start day, add 1 month
                        if (end.getDate() >= start.getDate()) {
                            totalMonths += 1;
                        }

                        Duration = totalMonths;
                        DurationUnit = "months";


                    } else if (paymentType === "per year") {
                        let years = end.getFullYear() - start.getFullYear();

                        // If end month > start month OR same month and end day >= start day, add 1
                        if (
                            end.getMonth() > start.getMonth() ||
                            (end.getMonth() === start.getMonth() && end.getDate() >= start.getDate())
                        ) {
                            years += 1;
                        }

                        Duration = years;
                        DurationUnit = "years";

                    }
                }
                oCustomerData.RentPrice = Duration * roomRentPrice;
                oCustomerData.Discount = oCustomer.Bookings?.[0]?.Discount || "0.00";

                // Add duration to model
                oCustomerData.Duration = Duration;
                oCustomerData.DurationUnit = DurationUnit;
                var sBranchCode = oCustomer.Bookings?.[0]?.BranchCode
                await this.Facilitysearch(sBranchCode)
                const totals = this.calculateTotals(aPersons, oCustomerData.RentPrice, sBranchCode, oCustomerData.Discount);
                if (totals) {
                    Object.assign(oCustomerData, totals);
                }
                const oCustomerModel = new sap.ui.model.json.JSONModel(oCustomerData);
                this.getView().setModel(oCustomerModel, "CustomerData");

                // Now it is available here:
                // Set model
            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        calculateTotals: function (aPersons, roomRentPrice, sBranchCode, Discount) {
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
                        days = dayDiff / (1000 * 60 * 60 * 24) + 1; // inclusive
                    } else {
                        days = dayDiff / (1000 * 60 * 60 * 24) + 1; // for months/years we don't use days
                    }


                    // if (days <= 0) {
                    //     console.warn("Invalid facility date range:", f);
                    //     return;
                    // } 

                    // -------------------------------
                    // Calculate Months
                    // -------------------------------
                    const months =
                        (facEnd.getFullYear() - facStart.getFullYear()) * 12 +
                        (facEnd.getMonth() - facStart.getMonth()) +
                        (facEnd.getDate() >= facStart.getDate() ? 0 : -1);

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
                        f.TotalMonths = totalMonths;
                        fTotal = fPrice;
                        otherFacilitiesTotal += fTotal;

                    } else if (unit === "Per Year") {
                        f.TotalYears = totalYears;
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
                    });

                });
            });

            // -------------------------------
            // Final Price Calculation
            // -------------------------------
            const FacilityPrice = totalFacilityPricePerDay + otherFacilitiesTotal;
            let DiscountAmount = Discount || 0;
            const SubTotal = FacilityPrice + roomRentPrice - DiscountAmount;

            const SGST = SubTotal * 0.09;
            const CGST = SubTotal * 0.09;
            const grandTotal = SubTotal + SGST + CGST;

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
                    sap.ui.core.BusyIndicator.show(0);

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
                    sap.ui.core.BusyIndicator.hide();
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
                } else if (oStart <= oEnd) {
                    iDays = Math.ceil((oEnd - oStart) / (1000 * 60 * 60 * 24)) + 1;
                } else {
                    oEnd = null;
                    iDays = 0;
                }
            }
            if (oEnd && iDays === 0) {
                iDays = Math.floor((oEnd - oStart) / (1000 * 60 * 60 * 24)) + 1;
            }

            // Update model
            oModel.setProperty("/EndDate", oEnd ? this.Formatter.formatDate(oEnd.toISOString().split("T")[0]) : "");
            oModel.setProperty("/TotalDays", iDays);
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
                oEnd.setMonth(oEnd.getMonth() + iCount);
                oEnd.setDate(oEnd.getDate() - 1)
            }
            if (oEnd && iDays === 0) {
                iDays = Math.floor((oEnd - oStart) / (1000 * 60 * 60 * 24)) + 1;
            }

            // Format yyyy-MM-dd for DatePicker
            const sFormatted = oEnd.toISOString().split("T")[0];

            oModel.setProperty("/EndDate", this.Formatter.formatDate(sFormatted));
            oModel.setProperty("/TotalDays", iDays);
        },

        onEditFacilitySave: function () {
            var oCustomerModel = this.getView().getModel("CustomerData");
            var oCustomerData = oCustomerModel.getData();
            var oPayload = this.getView().getModel("edit").getData();

            if (oPayload.UnitText === "Per Month") {
                var Month = sap.ui.getCore().byId("idMonthYearSelectFragment").getSelectedKey();
                oPayload.TotalHour = Month || "1";
            } else if (oPayload.UnitText === "Per Year") {
                var Month = sap.ui.getCore().byId("idMonthYearSelectFragment").getSelectedKey();
                oPayload.TotalHour = Month || "1";
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

                oPayload.TotalAmount = finalPrice;

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

                if (oCustomerData.CouponCode || this.Code) {
                    var oCouponData = this.getView().getModel("CouponModel").getData();
                    var sEnteredCode = this.Code || oCustomerData.CouponCode; // user entered code
                    var oMatchedCoupon = oCouponData.find(coupon => coupon.CouponCode === sEnteredCode);

                    if (oMatchedCoupon.MinOrderValue <= (total + (oCustomerData.RentPrice || 0))) {

                        if (oMatchedCoupon.DiscountType === "Percentage" && this.CouponDiscount) {
                            oCustomerData.Discount = (total + (oCustomerData.RentPrice || 0)) * Number(this.CouponDiscount) / 100
                        } else {
                            oCustomerData.Discount = this.CouponDiscount || oCustomerData.Discount || "0.00";
                        }

                    } else {
                        oCustomerData.Discount = "0.00";
                        this.getView().getModel("VisibleModel").setProperty("/IsCouponApplied", false);
                        this.getView().getModel("Bookingmodel").setProperty("/CouponCode", "");
                        var oInput = this.getView().byId("couponInput");
                        this.Code = ""
                        oInput.setValue("");
                        oInput.setShowValueHelp(false);
                    }
                }

                oCustomerData.RentPrice = oCustomerData.RentPrice || 0;
                oCustomerData.SubTotal = (total + (oCustomerData.RentPrice || 0) - Number(oCustomerData.Discount));
                oCustomerData.SGST = oCustomerData.SubTotal * 0.09;
                oCustomerData.CGST = oCustomerData.SubTotal * 0.09;
                oCustomerData.GrandTotal = oCustomerData.SubTotal + oCustomerData.SGST + oCustomerData.CGST;

                // Update model
                oCustomerModel.setData(oCustomerData);
                oCustomerModel.refresh();

                this.HM_Dialog.close();
                sap.m.MessageToast.show(this.i18nModel.getText("facilityUpdatedSuccessfully"));

                this._editIndex = undefined;

            } else {
                sap.m.MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"))
            }
        },

        onEditBooking: async function () {
            this.applyCountryStateCityFilters()
            const oMobile = this.byId("CD_ID_idPhone");

            sap.ui.core.BusyIndicator.show(0);
            const response = await this.ajaxReadWithJQuery("HM_Customer", "");
            sap.ui.core.BusyIndicator.hide();
            const oCustomer = response?.Customers || response?.value?.[0] || {};

            this.getView().getModel("VisibleModel").setProperty("/visible", true)
            var data = this.getView().getModel("CustomerData").getData()
            var model = this.getView().getModel("Bookingmodel")
            var aAvailableBeds = this.getView().getModel("Availablebeds").getData()
               if (data.STDCode === "+91") {
                oMobile.setMaxLength(10);
            } else {
                oMobile.setMaxLength(18);
            }
            
            var filteredBeds = aAvailableBeds.filter(function (bed) {

                // 1) Count assigned customers for this bed
                var assignedCount = oCustomer.filter(function (cust) {
                    return cust.BranchCode === bed.BranchCode &&
                        cust.BedType === bed.BedTypeName &&
                        cust.Status === "Assigned"
                }).length;

                var customerHasThisBed = oCustomer.some(function (cust) {
                    return cust.CustomerID === data.CustomerID && // replace with your customer identifier
                        cust.BedType === bed.BedTypeName &&
                        (cust.Status === "Assigned" || cust.Status === "New")
                });

                // 2) If assignedCount reaches bed capacity → remove bed from available list
                if (assignedCount >= Number(bed.NoofPerson) && !customerHasThisBed) {
                    return false; // remove bed
                }

                return true; // keep bed
            });

            this.getView().getModel("Availablebeds").setData(filteredBeds);
            if (data.CouponCode) {
                this.Coupon()
            } else {
                this.getView().byId("couponInput").setShowValueHelp(false);
            }

            model.setProperty("/BedTypeName", data.BedType)
            model.setProperty("/CouponCode", data.CouponCode)
            model.setProperty("/UnitText", data.PaymentType)
            model.setProperty("/StartDate", data.StartDate)
            model.setProperty("/EndDate", data.EndDate)
            model.setProperty("/CustomerName", data.CustomerName)
            model.setProperty("/DateOfBirth", data.DateOfBirth)
            model.setProperty("/Gender", data.Gender)
            model.setProperty("/CustomerEmail", data.CustomerEmail)
            model.setProperty("/Country", data.Country)
            model.setProperty("/State", data.State)
            model.setProperty("/City", data.City)
            model.setProperty("/STDCode", data.STDCode)
            model.setProperty("/MobileNo", data.MobileNo)
            model.setProperty("/Salutation", data.Salutation)
            model.setProperty("/Address", data.Address)

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
                oEndDatePicker.setMinDate(oStart);
            }

            // DAILY CALCULATION
            if (sUnit === "daily" || sUnit === "Per Day") {

                if (!oEnd) {
                    sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectEndDateforDailyCalculation"));
                    return;
                }

                // Validate EndDate >= StartDate
                if (oEnd < oStart) {
                    // Clear EndDate
                    oBookingModel.setProperty("/EndDate", "");
                    if (oEndDatePicker) oEndDatePicker.setValue("");

                    sap.m.MessageToast.show(this.i18nModel.getText("endDatecannotbeearlierthanStartDate"));
                    return;
                }

                // Calculate day difference
                var diffTime = oEnd - oStart;
                var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 || 1;

                oCustomerModel.setProperty("/RentPrice", diffDays * originalRent);
                oCustomerModel.setProperty("/Duration", diffDays);
                var SGST = (diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice"))) * 0.09
                var SubTotal = (diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice")))

                oCustomerModel.setProperty("/SGST", SGST);
                oCustomerModel.setProperty("/CGST", SGST);
                oCustomerModel.setProperty("/SubTotal", SubTotal);
                oCustomerModel.setProperty("/Discount", 0.00)
                oCustomerModel.setProperty("/GrandTotal", diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice") || 0) + SGST + SGST);
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
                var SGST = (diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice"))) * 0.09
                var SubTotal = (diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice")))

                oCustomerModel.setProperty("/SGST", SGST);
                oCustomerModel.setProperty("/CGST", SGST);
                oCustomerModel.setProperty("/SubTotal", SubTotal);
                oCustomerModel.setProperty("/GrandTotal", diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice") || 0) + SGST + SGST);
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
                var SGST = (diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice"))) * 0.09
                var SubTotal = (diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice")))

                oCustomerModel.setProperty("/SGST", SGST);
                oCustomerModel.setProperty("/CGST", SGST);
                oCustomerModel.setProperty("/SubTotal", SubTotal);
                oCustomerModel.setProperty("/GrandTotal", diffDays * originalRent + (oCustomerModel.getProperty("/TotalFacilityPrice") || 0) + SGST + SGST);
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
            var CGST = (fPrice + fFacilityPrice) * 0.09
            var SubTotal = fPrice + fFacilityPrice

            oCustomerData.setProperty("/SGST", CGST);
            oCustomerData.setProperty("/CGST", CGST);
            oCustomerData.setProperty("/SubTotal", SubTotal);
            oCustomerData.setProperty("/Discount", 0.00)
            // oCustomerData.setProperty("/GrandTotal", fPrice + fFacilityPrice);
            oCustomerData.setProperty("/GrandTotal", fPrice + fFacilityPrice + CGST + CGST);

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

            var sStartDate = oSelectedData.StartDate.split("/").reverse().join("-"); // e.g. "2025-01-15"
var sEndDate   = oSelectedData.EndDate.split("/").reverse().join("-");   // e.g. "2025-06-14"

if (sStartDate && sEndDate) {
    var oStart = new Date(sStartDate);
    var oEnd = new Date(sEndDate);

    var iMonths =
        (oEnd.getFullYear() - oStart.getFullYear()) * 12 +
        (oEnd.getMonth() - oStart.getMonth());

    // Optional: include partial month logic
    if (oEnd.getDate() >= oStart.getDate()) {
        iMonths += 1;
    }

}

            // 👉 STORE INDEX for update later
            this._editIndex = Number(oContext.getPath().split("/").pop());

            // Load data into edit model
            this.getView().getModel("edit").setData(Object.assign({}, oSelectedData));
            this.getView().getModel("edit").setProperty("/TotalUnits", iMonths)
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

            if (oCustomerData.CouponCode || this.Code) {
                var oCouponData = this.getView().getModel("CouponModel").getData().
                    find((item) => item.CouponCode === this.Code || oCustomerData.CouponCode)
                    || {};

                if (oCouponData.DiscountType === "Percentage") {
                    oCustomerData.Discount = (total + (oCustomerData.RentPrice || 0)) * Number(this.CouponDiscount) / 100
                } else {
                    oCustomerData.Discount = Number(oCouponData.DiscountValue)
                }
                if (total + (oCustomerData.RentPrice || 0) < Number(oCouponData.MinOrderValue)) {
                    oCustomerData.Discount = "0.00";
                    this.getView().getModel("VisibleModel").setProperty("/IsCouponApplied", false);
                    this.getView().getModel("Bookingmodel").setProperty("/CouponCode", "");
                    var oInput = this.getView().byId("couponInput");
                    this.Code = ""
                    oInput.setValue("");
                    oInput.setShowValueHelp(false);
                }
            }

            oCustomerData.SubTotal = (total + (oCustomerData.RentPrice || 0) - Number(oCustomerData.Discount));
            oCustomerData.SGST = oCustomerData.SubTotal * 0.09;
            oCustomerData.CGST = oCustomerData.SubTotal * 0.09;
            oCustomerData.GrandTotal = oCustomerData.SubTotal + oCustomerData.SGST + oCustomerData.CGST;
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
                var SubTotal = fPrice + fFacilityPrice
                var CGST = (fPrice + fFacilityPrice) * 0.09

                oCustomerModel.setProperty("/SGST", CGST)
                oCustomerModel.setProperty("/CGST", CGST)
                oCustomerModel.setProperty("/SubTotal", SubTotal)
                oCustomerModel.setProperty("/Discount", 0.00)
                oCustomerModel.setProperty("/GrandTotal", fPrice + fFacilityPrice + CGST * 2);

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
                        iDuration = Math.ceil((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1;
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
                var SubTotal = fOriginalRentPrice + fFacilityPrice
                var CGST = (fOriginalRentPrice + fFacilityPrice) * 0.09

                oCustomerModel.setProperty("/SGST", CGST)
                oCustomerModel.setProperty("/CGST", CGST)
                oCustomerModel.setProperty("/SubTotal", SubTotal)
                oCustomerModel.setProperty("/Discount", 0.00)
                oCustomerModel.setProperty("/GrandTotal", fOriginalRentPrice + fFacilityPrice + CGST * 2);
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
            var formatted = diff.toFixed(2);
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

        CC_onChangeState: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            const oView = this.getView();
            const oModel = oView.getModel("Bookingmodel");
            const oItem = oEvent.getSource().getSelectedItem();
            const oCityCB = oView.byId("CC_id_City");
            const oCountryCB = oView.byId("CC_id_Country");

            // Reset
            oModel.setProperty("/City", "");
            oCityCB.setSelectedKey("");
            oCityCB.setValue("");
            oCityCB.getBinding("items")?.filter([]);

            if (!oItem) {
                oModel.setProperty("/State", "");
                return;
            }

            const sStateName = oItem.getKey();
            const sCountryCode = oCountryCB.getSelectedItem()?.getAdditionalText();
            oModel.setProperty("/State", sStateName);

            // Apply city filter
            oCityCB.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sStateName),
                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
            ]);
        },

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
    if (std==="+91" && mobileValue.length === requiredLength) {
        oMobile.setValueState("None");       // valid
    } else {
        oMobile.setValueState("Error");      // invalid
    }
    if(std!="+91"){
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

        onSaveBooking: function () {
            var Bookingdata = this.getView().getModel("Bookingmodel").getData();
            var CustomerData = this.getView().getModel("CustomerData").getData();
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
                utils._LCstrictValidationComboBox(this.byId("CC_id_City"), "ID") && 
                utils._LCvalidateMandatoryField(this.byId("Ad_id_Address"), "ID") && 
                utils._LCstrictValidationComboBox(this.byId("CC_id_STDCode"), "ID")
            );

         
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
                    "TotalRoomprice": CustomerData.RentPrice
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
                        BasicFacilityPrice: item.Price


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

            // Send payload
            sap.ui.core.BusyIndicator.show(0);
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

                        sap.ui.core.BusyIndicator.show(0);
                        const custid = oData.CustomerID; // FIXED

                        await that.ajaxUpdateWithJQuery("HM_Customer", {
                            data: personData,
                            filters: {
                                CustomerID: custid
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
                        sap.ui.core.BusyIndicator.hide();
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

            aDocs.find((item)=>{
                if(item.DocumentType?.replace(/\s+/g, '').toLowerCase() ===DocumentType?.replace(/\s+/g, '').toLowerCase()){
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
                b64 = b64.replace(/\s/g, "");
                let last = b64;

                // Try decoding multiple times (max 5 to prevent infinite loop)
                for (let i = 0; i < 5; i++) {
                    try {
                        if (last.startsWith("iVB") || last.startsWith("/9j")) {
                            return decoded;
                        }
                        let decoded = atob(last);

                        // If decoded looks like IMAGE base64 → return

                        // Continue decoding if possible
                        last = decoded;
                    } catch (e) {
                        break;
                    }
                }

                return last;
            }

            // Get document from model
            var oContext = oEvent.getSource().getBindingContext("CustomerData");
            var oDoc = oContext.getObject();

            if (!oDoc) {
                sap.m.MessageBox.error(this.i18nModel.getText("nodocfound"));
                return;
            }
            var sBase64 = oDoc.FileContent || oDoc.File;

            if (!sBase64) {
                sap.m.MessageBox.error(this.i18nModel.getText("noImageFoundforthisDocument"));
                return;
            }

            // Auto fix decoding
            var fixed = autoDecodeBase64(sBase64);

            // Now detect type
            let finalSrc = "";

            if (fixed.startsWith("iVB")) {
                finalSrc = "data:image/png;base64," + fixed;
            } else if (fixed.startsWith("/9j")) {
                finalSrc = "data:image/jpeg;base64," + fixed;
            } else {
                finalSrc = fixed

            }

            // Create or reuse dialog
            if (!this._oDocPreviewDialog) {
                var oFlex = new sap.m.FlexBox({
                    width: "100%",
                    height: "100%",
                    renderType: "Div",
                    justifyContent: "Center",
                    alignItems: "Center",
                    items: [
                        new sap.m.Image({
                            id: this.createId("docPreviewImage"),
                            densityAware: false,
                            width: "100%",
                            height: "100%",
                            style: "object-fit: contain; display:block;"
                        })
                    ]
                });

                this._oDocPreviewDialog = new sap.m.Dialog({
                    title: oDoc.FileName || "Document Image",
                    contentWidth: "50%",
                    contentHeight: "60%",
                    draggable: true,
                    resizable: true,
                    contentPadding: "0rem",
                    horizontalScrolling: false,
                    verticalScrolling: true,
                    content: [oFlex],

                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: function () {
                            this._oDocPreviewDialog.close();
                        }.bind(this)
                    }),

                    afterClose: function () {
                        this._oDocPreviewDialog.destroy();
                        this._oDocPreviewDialog = null;
                    }.bind(this)
                });

                this.getView().addDependent(this._oDocPreviewDialog);
            } else {
                this._oDocPreviewDialog.setTitle(oDoc.FileName || "Document Image");
            }

            // Set final image
            this.byId("docPreviewImage").setSrc(finalSrc);
            this._oDocPreviewDialog.open();
        },

        onApplyCoupon: async function () {
            var oCustomerData = this.getView().getModel("CustomerData").getData();
            var Bookingmodel = this.getView().getModel("Bookingmodel").getData();

            var sEnteredCode = Bookingmodel.CouponCode || this.getView().byId("couponInput").getValue();
            const filter = {
                CouponCode: sEnteredCode,
                Status: "Active"
            };
            sap.ui.core.BusyIndicator.show(0);
            await this.ajaxReadWithJQuery("HM_Coupon", filter).then((oData) => {
                var aCoupon = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(aCoupon);
                this.getView().setModel(model, "CouponModel")

            });
            sap.ui.core.BusyIndicator.hide();
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
        }
    });
});