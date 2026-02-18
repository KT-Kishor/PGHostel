sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "../utils/validation",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Filter",
], function (
    BaseController,
    JSONModel,
    Formatter, utils,
    BusyIndicator,
    MessageToast,
    MessageBox,
    FilterOperator,
    Filter
) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Book_Room", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteBookRoom").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._bPricingDirty = true; // For calculation 
            var oMessageManager = sap.ui.getCore().getMessageManager();

            // Register view
            oMessageManager.registerObject(this.getView(), true);

            //  CLEAR old messages (CRITICAL)
            oMessageManager.removeAllMessages();

            // Expose MessageModel
            this.getOwnerComponent().setModel(
                oMessageManager.getMessageModel(),
                "message"
            );
            if (performance.navigation && performance.navigation.type === 1) {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteHostel", {}, true);
            }
            // this.commonLoginFunction();
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this._ViewDatePickersReadOnly(["idStartDate1", "idEndDate1", "ID_DOB_"], this.getView());
            var oView = this.getView()

            const oUserModel = sap.ui.getCore().getModel("LoginModel");
            if (oUserModel) {
                this._oLoggedInUser = oUserModel.getData();
            } else {
                this._oLoggedInUser = {}; // fallback
            }
            let oHostelModel = sap.ui.getCore().getModel("HostelModel");

            var aItems = [];

            if (Number(oHostelModel.getProperty("/Price")) > 0) {
                aItems.push({ key: "Per Day", text: "Per Day" });
            }

            if (Number(oHostelModel.getProperty("/MonthPrice")) > 0) {
                aItems.push({ key: "Per Month", text: "Per Month" });
            }

            if (Number(oHostelModel.getProperty("/YearPrice")) > 0) {
                aItems.push({ key: "Per Year", text: "Per Year" });
            }

            oHostelModel.setProperty("/AvailablePaymentMethods", aItems);
            if (!oHostelModel.getProperty("/SelectedMonths")) {
                oHostelModel.setProperty("/SelectedMonths", "1");
            }

            oView.setModel(new JSONModel({
                fullname: "",
                Email: "",
                Mobileno: "",
                password: "",
                comfirmpass: ""
            }), "LoginMode");
            oView.setModel(new JSONModel({
                selectedSection: "profile"
            }), "profileSectionModel");

            if (!oHostelModel) {
                // If not found, create a fallback model
                oHostelModel = new JSONModel({
                    UserID: "",
                    BedType: "",
                    ACType: "",
                    Price: "",
                    PaymentType: "",
                    Person: "",
                    StartDate: "",
                    EndDate: "",
                    FinalPrice: "",
                    SelectedPriceType: "",
                    Capacity: "",
                    SelectedPrice: "",
                    StopPriceRecalculateByPerson: false,
                    Country: "",
                    Deposit: "",
                    AppliedCoupons: []
                });
                sap.ui.getCore().setModel(oHostelModel, "HostelModel");
            }

            this.getView().setModel(new JSONModel({
                Amount: "",
                PaymentType: "UPI",
                PaymentDate: new Date()
            }), "PaymentModel");

            //  Ensure defaults come from previous step (HostelModel)

            const oData = oHostelModel.getData();

            //  RESET VALUES EVERY TIME ROUTE LOADS
            oHostelModel.setProperty("/StartDate", "");
            oHostelModel.setProperty("/EndDate", "");
            oHostelModel.setProperty("/Salutation", "");
            oHostelModel.setProperty("/FullName", "");
            oHostelModel.setProperty("/SelectedMonths", "1");
            oHostelModel.setProperty("/SelectedPerson", "1");
            // If older fields exist, normalize them to new ones
            if (oData.RoomType && !oData.BedType && oData.RoomType.includes("-")) {
                const parts = oData.RoomType.split("-");
                oData.BedType = parts[0]?.trim();
                oData.ACType = parts[1]?.trim();
            }

            // Assign FinalPrice and SelectedPriceType
            if (oData.SelectedPriceValue) {
                oData.FinalPrice = oData.SelectedPriceValue;
            }

            if (oData.SelectedPriceType.includes(oData.SelectedPriceType)) {
                const map = {
                    "Per Day": "Per Day",
                    "Per Month": "Per Month",
                    "Per Year": "Per Year"
                };
                oData.SelectedPriceType = map[oData.SelectedPriceType] || "Per Month";
            }

            oHostelModel.refresh(true);
            this.getView().setModel(oHostelModel, "HostelModel");

            setTimeout(() => {
                this._LoadFacilities()
            }, 100);
            var oBTn = new JSONModel({
                Next: false,
                Previous: false,
                Submit: false,
                Cancel: false,
                NXTVis: true,
                PERVIOUSVIS: false,
                Month: false,
                Year: false,
              
            })
            this.getView().setModel(oBTn, "OBTNModel")
            var oEndDatePicker = this.getView().byId("idEndDate1")
            const sSelectedType = oData.SelectedPriceType?.toLowerCase() || "";

            if (sSelectedType === "per day") {
                oBTn.setProperty("/Month", false);

                oEndDatePicker.setEditable(true)
            } else if (sSelectedType === "per month") {
                oBTn.setProperty("/Month", true);
                oEndDatePicker.setEditable(false)
            } else if (sSelectedType === "per year") {
                oBTn.setProperty("/Month", true);

                oEndDatePicker.setEditable(false)
            }
            //  Refresh visibility
            oBTn.refresh(true);

            setTimeout(() => {
                this.Roomdetails();
            }, 100);
//           const aDate = this.getView().getModel("HostelModel");
// const sAvailableDate = aDate.getProperty("/AvailableDate"); // "20-02-2026"

// if (sAvailableDate) {
//     const oToday = this._parseDate(sAvailableDate);
//     if (oToday) {
//         oToday.setHours(0, 0, 0, 0);
//         oHostelModel.setProperty("/TodayDate", oToday);
//     }
// }else{
    const oToday = new Date();
            // Strip time (set hours to 0) to avoid timezone offset issues
            oToday.setHours(0, 0, 0, 0);
            oHostelModel.setProperty("/TodayDate", oToday);


            this.oWizard = this.byId("TC_id_wizard");
            this.oWizard.discardProgress(this.byId("TC_id_stepGeneralInfo"));
            this.oWizard.goToStep(this.byId("TC_id_stepGeneralInfo"));
            this.oWizard.getSteps()[0].setValidated(true);
            this.oWizard.getSteps()[1].setValidated(false);
            this.oWizard.getSteps()[2].setValidated(false);
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
            this._perDayInfoShown = false;
            oHostelModel.setProperty("/IsGeneralInfoValid", true);  //wizard step validation
this._bBlockMessagePopover = false;
        },

        Roomdetails: async function () {
            try {
                const oData = await this.ajaxReadWithJQuery("HM_Rooms", {});
                let aBedTypes = Array.isArray(oData.commentData) ?
                    oData.commentData :
                    [oData.commentData];
                const oBedTypeModel = new JSONModel(aBedTypes);
                this.getView().setModel(oBedTypeModel, "RoomDetailModel");
                this._oWizard = this.byId("TC_id_wizard");
                this._iSelectedStepIndex = 0;
                this._oSelectedStep = this._oWizard.getSteps()[this._iSelectedStepIndex];
                this.handleButtonsVisibility();

            } catch (err) {
                console.error("Error while fetching Bed Type details:", err);
            }
        },

        _LoadFacilities: async function () {
            const oView = this.getView();

            try {
                const oHostelModel = sap.ui.getCore().getModel("HostelModel").getData();
                const oBranch = oHostelModel.BranchCode;

                const Response = await this.ajaxReadWithJQuery("HM_Facilities", { BranchCode: oBranch });
                const aFacilities = Response?.data || [];

                //  Default images ONLY by Type
                const defaultTypeImages = {
                    "high-speed wi-fi": "./image/High-Speed Wi-Fi.jpg",
                    "laundry service": "./image/Laundry Service.jpg",
                    "ironing service": "./image/Ironing Service.jpg",
                    "housekeeping": "./image/Housekeeping.jpg",
                    "meals / food subscription": "./image/Meals.jpg",
                    "gym membership": "./image/gym.jpg",
                    "two-wheeler parking": "./image/Two-Wheeler Parking.webp",
                    "four-wheeler parking": "./image/Four Wheeler Parking.jpg",
                    "locker / storage facility": "./image/locker.jpg",
                    "power backup": "./image/Power Backup.jpeg",
                    "air conditioner": "./image/Air Conditioner.jpeg",
                    "room heater": "./image/Room Heater.jpeg",
                    "study room access": "./image/StudyRoom.png"
                };

                //Base64 Convert Logic
                const convertBase64ToImage = (base64String, fileType, type) => {

                    const typeKey = (type || "").toLowerCase().trim();
                    const fallback = defaultTypeImages[typeKey] || "./image/Fallback.png";

                    // Case 1️⃣ DB Image exists
                    if (base64String && base64String.trim()) {
                        let sBase64 = base64String.replace(/\s/g, "");

                        try {
                            if (!sBase64.startsWith("data:image")) {
                                atob(sBase64.substring(0, 40)); // Validate base64
                            }
                        } catch (e) {
                            console.warn("Invalid base64 image:", type);
                            return fallback;
                        }

                        const mimeType = fileType || "image/jpeg";
                        return `data:${mimeType};base64,${sBase64}`;
                    }

                    // Case 2️⃣ No image → Type default
                    return fallback;
                };

                // Map Facilities
                const aFinalFacilities = aFacilities.map(f => ({
                    FacilityID: f.ID,
                    FacilityName: f.FacilityName,
                    Type: f.Type,
                    Image: convertBase64ToImage(f.Photo1, f.Photo1Type, f.Type),
                    PricePerHour: f.PerHourPrice,
                    PricePerDay: f.PerDayPrice,
                    PricePerMonth: f.PerMonthPrice,
                    PricePerYear: f.PerYearPrice,
                    UnitText: f.UnitText,
                    Currency: f.Currency,
                    BranchCode: f.BranchCode
                }));

                this._aAllFacilities = aFinalFacilities;

                oView.setModel(new JSONModel({ Facilities: aFinalFacilities }), "FacilityModel");
                this._applyFacilityPriceFilter();
            } catch (err) {
                console.error("Facility Load Error", err);
                sap.m.MessageBox.error("Unable to load facilities.");
            }
        },
        _applyFacilityPriceFilter: function () {
            const oView = this.getView();
            const oHostelModel = oView.getModel("HostelModel");
            const oFacilityModel = oView.getModel("FacilityModel");

            if (!oFacilityModel || !this._aAllFacilities) return;

            const sPriceType = oHostelModel.getProperty("/SelectedPriceType");

            const aFiltered = this._aAllFacilities.filter(fac => {
                switch (sPriceType) {
                    case "Per Day":
                        return fac.PricePerDay && fac.PricePerDay > 0;

                    case "Per Month":
                        return fac.PricePerMonth && fac.PricePerMonth > 0;

                    case "Per Year":
                        return fac.PricePerYear && fac.PricePerYear > 0;

                    default:
                        return true;
                }
            });

            oFacilityModel.setProperty("/Facilities", aFiltered);
        },


        onDialogClose: function () {
            this._oLoginAlertDialog.close()
        },

        _checkMandatoryFields: function () {
            const oModel = this.getView().getModel("HostelModel");
            const aPersons = oModel.getProperty("/Persons") || [];

            //  Clear previous messages FIRST
            const oMessageManager = sap.ui.getCore().getMessageManager();
            oMessageManager.removeAllMessages();

            let aMissingFields = [];

            aPersons.forEach((person, index) => {
                let prefix = "Person " + (index + 1) + ": ";

                if (!person.Salutation) {
                    aMissingFields.push(prefix + "Salutation");
                    //  CORRECT WAY: Create Message instance
                    const oMessage = new sap.ui.core.message.Message({
                        type: sap.ui.core.MessageType.Error,
                        title: "Required Field Missing",
                        message: prefix + "Salutation is required",
                        additionalText: "Please select a salutation"
                    });
                    oMessageManager.addMessages(oMessage);  // Note: addMessages() plural
                }

                if (!person.FullName) {
                    aMissingFields.push(prefix + "Full Name");
                    const oMessage = new sap.ui.core.message.Message({
                        type: sap.ui.core.MessageType.Error,
                        title: "Required Field Missing",
                        message: prefix + "Full Name is required",
                        additionalText: "Please enter full name"
                    });
                    oMessageManager.addMessages(oMessage);
                }

                if (!person.DateOfBirth) {
                    aMissingFields.push(prefix + "Date of Birth");
                    const oMessage = new sap.ui.core.message.Message({
                        type: sap.ui.core.MessageType.Error,
                        title: "Required Field Missing",
                        message: prefix + "Date of Birth is required",
                        additionalText: "Please select date of birth"
                    });
                    oMessageManager.addMessages(oMessage);
                }
                if (!person.Gender) {
                    aMissingFields.push(prefix + "Gender");
                    const oMessage = new sap.ui.core.message.Message({
                        type: sap.ui.core.MessageType.Error,
                        title: "Required Field Missing",
                        message: prefix + "Gender is required",
                        additionalText: "Please select gender"
                    });
                    oMessageManager.addMessages(oMessage);
                }

                if (!person.CustomerEmail) {
                    aMissingFields.push(prefix + "Email");
                    const oMessage = new sap.ui.core.message.Message({
                        type: sap.ui.core.MessageType.Error,
                        title: "Required Field Missing",
                        message: prefix + "Email is required",
                        additionalText: "Please enter email"
                    });
                    oMessageManager.addMessages(oMessage);
                }
                if (!person.Country) {
                    aMissingFields.push(prefix + "Country");
                    const oMessage = new sap.ui.core.message.Message({
                        type: sap.ui.core.MessageType.Error,
                        title: "Required Field Missing",
                        message: prefix + "Country is required",
                        additionalText: "Please select country"
                    });
                    oMessageManager.addMessages(oMessage);
                }
                if (!person.State) {
                    aMissingFields.push(prefix + "State");
                    const oMessage = new sap.ui.core.message.Message({
                        type: sap.ui.core.MessageType.Error,
                        title: "Required Field Missing",
                        message: prefix + "State is required",
                        additionalText: "Please select state"
                    });
                    oMessageManager.addMessages(oMessage);
                }
                if (!person.City) {
                    aMissingFields.push(prefix + "City");
                    const oMessage = new sap.ui.core.message.Message({
                        type: sap.ui.core.MessageType.Error,
                        title: "Required Field Missing",
                        message: prefix + "City is required",
                        additionalText: "Please select city"
                    });
                    oMessageManager.addMessages(oMessage);
                }
                if (!person.STDCode) {
                    aMissingFields.push(prefix + "STD Code");
                    const oMessage = new sap.ui.core.message.Message({
                        type: sap.ui.core.MessageType.Error,
                        title: "Required Field Missing",
                        message: prefix + "STD Code is required",
                        additionalText: "Please enter STD code"
                    });
                    oMessageManager.addMessages(oMessage);
                }
                if (!person.MobileNo) {
                    aMissingFields.push(prefix + "Mobile No");
                    const oMessage = new sap.ui.core.message.Message({
                        type: sap.ui.core.MessageType.Error,
                        title: "Required Field Missing",
                        message: prefix + "Mobile No is required",
                        additionalText: "Please enter mobile number"
                    });
                    oMessageManager.addMessages(oMessage);
                }
                if (!person.Address) {
                    aMissingFields.push(prefix + "Address");
                    const oMessage = new sap.ui.core.message.Message({
                        type: sap.ui.core.MessageType.Error,
                        title: "Required Field Missing",
                        message: prefix + "Address is required",
                        additionalText: "Please enter address"
                    });
                    oMessageManager.addMessages(oMessage);
                }

                // Add other fields similarly...
            });

            return aMissingFields;
        },

        onNoOfPersonSelect: function (oEvent) {
            const oModel = this.getView().getModel("HostelModel");

            let sKey = oEvent?.getSource()?.getSelectedKey() || oModel.getProperty("/SelectedPerson");
            const iPersons = parseInt(sKey, 10) || 1;

            const prevCount = this._lastPersonCount || 0;

            oModel.setProperty("/SelectedPerson", iPersons);

            // Flag to recreate UI on next navigation
            this._mustRecreatePersonUI = (iPersons !== prevCount);

            this._lastPersonCount = iPersons;

            oModel.updateBindings(true);
            this._bPricingDirty = true;

            // >>> IMPORTANT FIX
            sap.ui.getCore().applyChanges();
        },

        onPressLoginBanner: function () {
            this._handleLoginAndAutofill();
        },

        _handleLoginAndAutofill: function () {
            const that = this;
            const oView = this.getView();
            const oModel = oView.getModel("HostelModel");
            const aPersons = oModel.getProperty("/Persons") || [];

            const oLoginModel = sap.ui.getCore().getModel("LoginModel");
            const oUser = oLoginModel ? oLoginModel.getData() : null;

            // ❗ User is NOT logged in → Open login dialog
            if (!oUser || !oUser.UserID) {

                if (!this._oLoginAlertDialog) {
                    this._oLoginAlertDialog = sap.ui.xmlfragment(
                        this.createId("LoginAlertDialog"),
                        "sap.ui.com.project1.fragment.SignInSignup",
                        this
                    );
                    oView.addDependent(this._oLoginAlertDialog);
                }

                const vm = oView.getModel("LoginViewModel");

                vm.setProperty("/authFlow", "signin");
                vm.setProperty("/loginMode", "password");
                vm.setProperty("/showOTPField", false);
                vm.setProperty("/isOtpEntered", false);
                vm.setProperty("/isOtpSelected", false);
                vm.setProperty("/isPasswordSelected", true);
                vm.setProperty("/dialogTitle", "Hostel Access Portal");

                this._resetAllAuthFields?.();
                this._clearAllAuthFields?.();

                // Reset OTP inputs
                const otpCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInOTP");
                if (otpCtrl) otpCtrl.setValue("").setEnabled(false);

                const btnSendOTP = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "btnSignInSendOTP");
                if (btnSendOTP) btnSendOTP.setVisible(false);

                sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInusername")?.setValue("").setValueState("None");
                sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signinPassword")?.setValue("").setValueState("None");
                sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInuserid")?.setValue("").setValueState("None");
                // sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signupvisible")?.setVisible(false);

                this._oLoginAlertDialog.open();
                return false; // Not logged in
            }

            // -----------------------------
            // ✔ User already logged in → Auto-fill all persons
            // -----------------------------
            const DOB = this.Formatter.DateFormat(oUser.DateOfBirth);

            aPersons.forEach(p => {
                p.Salutation = oUser.Salutation || "";
                p.FullName = oUser.UserName || "";
                p.CustomerEmail = oUser.EmailID || "";
                p.MobileNo = oUser.MobileNo || "";
                p.UserID = oUser.UserID || "";
                p.DateOfBirth = DOB;
                p.Gender = oUser.Gender || "";
                p.Country = oUser.Country || "";
                p.State = oUser.State || "";
                p.City = oUser.City || "";
                p.Address = oUser.Address || "";
                p.STDCode = oUser.STDCode || "";
            });

            oModel.refresh(true);
            return true; // Logged in & autofilled
        },

        _applyCountryStateCityForPersons: function () {
            const oView = this.getView();
            const oModel = oView.getModel("HostelModel");
            const aPersons = oModel.getProperty("/Persons") || [];

            const aCountryData = oView.getModel("CountryModel").getData();

            aPersons.forEach((p, i) => {

                if (!p.Country) return;

                const oCountryObj = aCountryData.find(c => c.countryName === p.Country);
                if (!oCountryObj) return;

                const sCountryCode = oCountryObj.code;

                // ---------- STATE FILTER ----------
                const oStateCombo = sap.ui.getCore().byId(this.createId("ID_State_" + i));
                if (oStateCombo) {
                    oStateCombo.getBinding("items")?.filter([
                        new Filter("countryCode", FilterOperator.EQ, sCountryCode)
                    ]);
                    oStateCombo.setValue(p.State || "");
                }

                // ---------- CITY FILTER ----------
                if (p.State) {
                    const oCityCombo = sap.ui.getCore().byId(this.createId("ID_City_" + i));
                    if (oCityCombo) {
                        oCityCombo.getBinding("items")?.filter([
                            new Filter("stateName", FilterOperator.EQ, p.State),
                            new Filter("countryCode", FilterOperator.EQ, sCountryCode)
                        ]);
                        oCityCombo.setValue(p.City || "");
                    }
                }
            });
        },

        _applyCountryStateCity: function () {
            const oView = this.getView();
            const oModel = oView.getModel("HostelModel");
            const aPersons = oModel.getProperty("/Persons") || [];

            const aCountryData = oView.getModel("CountryModel").getData();

            aPersons.forEach((p, i) => {

                if (!p.Country) return;

                const oCountryObj = aCountryData.find(
                    c => c.countryName === p.Country
                );
                if (!oCountryObj) return;

                const sCountryCode = oCountryObj.code;

                // ----- STATE FILTER -----
                const oStateCombo = sap.ui.getCore().byId(
                    this.createId("ID_State_" + i)
                );
                if (oStateCombo) {
                    oStateCombo.getBinding("items")?.filter([
                        new Filter(
                            "countryCode",
                            FilterOperator.EQ,
                            sCountryCode
                        )
                    ]);
                    oStateCombo.setValue(p.State || "");
                }

                // ----- CITY FILTER -----
                if (p.State) {
                    const oCityCombo = sap.ui.getCore().byId(
                        this.createId("ID_City_" + i)
                    );
                    if (oCityCombo) {
                        oCityCombo.getBinding("items")?.filter([
                            new Filter(
                                "stateName",
                                FilterOperator.EQ,
                                p.State
                            ),
                            new Filter(
                                "countryCode",
                                FilterOperator.EQ,
                                sCountryCode
                            )
                        ]);
                        oCityCombo.setValue(p.City || "");
                    }
                }
            });
        },

        _isPersonUIInitialized: false,
        _lastPersonCount: 1,


        _createDynamicPersonsUI: function () {
            var that = this
            const oModel = this.getView().getModel("HostelModel");
            const oFacilityModel = this.getView().getModel("FacilityModel");
            const oLoginModel = that.getView().getModel("LoginModel");
            const sUserID = oLoginModel?.getData().EmployeeID || "";
            const iPersons = oModel.getProperty("/SelectedPerson") || 1;

            const oVBox = this.getView().byId("idPersonalContainer1");
            const oData = oModel.getData();

            // Reset container & model array
            oData.Persons = [];
            oVBox.destroyItems();
            oData.ForBothSelected = iPersons > 1;
            for (let i = 0; i < iPersons; i++) {
                oData.Persons.push({
                    UserID: sUserID,
                    FullName: "",
                    DateOfBirth: "",
                    Gender: "",
                    MobileNo: "",
                    CustomerEmail: "",
                    Country: "",
                    State: "",
                    City: "",
                    Address: "",
                    Facilities: {
                        SelectedFacilities: []
                    },
                    Documents: [],
                    DocumentType: ""
                });

                /** ---- PERSON FORM ---- **/
                const oForm = new sap.ui.layout.form.SimpleForm({
                    editable: true,
                    title: "Person " + (i + 1) + " Details",
                    layout: "ColumnLayout",
                    adjustLabelSpan: false,
                    labelSpanXL: 4,
                    labelSpanL: 3,
                    labelSpanM: 4,
                    columnsXL: 2,
                    columnsL: 2,
                    columnsM: 1,
                    content: [
                        //  Only show the checkbox for the first person
                        ...(i === 0 ?
                            [
                                new sap.m.Label({
                                    text: "{i18n>fillyearself}"
                                }),
                                new sap.m.CheckBox({
                                    width: "100%",
                                    id: that.createId("IDSelfCheck_" + i),
                                    select: function (oEvent) {
                                        const oView = that.getView();
                                        const oModel = oView.getModel("HostelModel");
                                        const aPersons = oModel.getProperty("/Persons") || [];
                                        const bSelected = oEvent.getParameter("selected");

                                        const oLoginModel = that.getView().getModel("LoginModel");
                                        const oUser = oLoginModel ? oLoginModel.getData() : null;
                                        if (bSelected) {
                                            // No login yet → open dialog
                                            if (!oUser || !oUser.EmployeeID) {
                                                if (!that._oLoginAlertDialog) {
                                                    that._oLoginAlertDialog = sap.ui.xmlfragment(
                                                        that.createId("LoginAlertDialog"),
                                                        "sap.ui.com.project1.fragment.SignInSignup",
                                                        that
                                                    );
                                                    oView.addDependent(that._oLoginAlertDialog);
                                                }
                                                const vm = that.getView().getModel("LoginViewModel");

                                                // COMPLETE reset of all auth-related states
                                                vm.setProperty("/authFlow", "signin");
                                                vm.setProperty("/loginMode", "password");
                                                vm.setProperty("/showOTPField", false);
                                                vm.setProperty("/isOtpEntered", false);

                                                //  FIX: You forgot these
                                                vm.setProperty("/isOtpSelected", false);
                                                vm.setProperty("/isPasswordSelected", true);

                                                // Reset fields
                                                this._resetAllAuthFields?.();
                                                this._clearAllAuthFields?.();

                                                // Reset OTP UI
                                                const otpCtrl = sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "signInOTP");
                                                if (otpCtrl) {
                                                    otpCtrl.setValue("");
                                                    otpCtrl.setEnabled(false);
                                                }

                                                const btnSendOTP = sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "btnSignInSendOTP");
                                                if (btnSendOTP) btnSendOTP.setVisible(false);

                                                // Reset password valid state
                                                const passCtrl = sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "signinPassword");
                                                if (passCtrl) {
                                                    passCtrl.setEnabled(true);
                                                    passCtrl.setValue("");
                                                    passCtrl.setValueState("None");
                                                }

                                                // Reset dialog title
                                                vm.setProperty("/dialogTitle", "Hostel Access Portal");


                                                that._oLoginAlertDialog.open();
                                                sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "signInEmail").setValue("").setValueState("None");
                                                sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "signinPassword").setValue("").setValueState("None");

                                                oEvent.getSource().setSelected(false);
                                                return;
                                            }

                                            oLoginModel.setProperty("/UserID", oUser.UserID || oUser.EmployeeID);
                                            oLoginModel.setProperty("/Salutation", oUser.Salutation);
                                            oLoginModel.setProperty("/STDCode", oUser.STDCode);
                                            oLoginModel.setProperty("/Gender", oUser.Gender);
                                            oLoginModel.setProperty("/Country", oUser.Country);
                                            oLoginModel.setProperty("/State", oUser.State);
                                            oLoginModel.setProperty("/City", oUser.City);
                                            oLoginModel.setProperty("/Address", oUser.Address);
                                            oLoginModel.setProperty("/UserName", oUser.EmployeeName || oUser.UserName);
                                            oLoginModel.setProperty("/EmailID", oUser.EmailID);
                                            oLoginModel.setProperty("/MobileNo", oUser.MobileNo);
                                            oLoginModel.setProperty("/DateOfBirth", that.Formatter.DateFormat(oUser.DateOfBirth) || oUser.DateofBirth);
                                            const DOB = that.Formatter.DateFormat(oUser.DateOfBirth)
                                            if (oUser.Role !== "Customer") {
                                                MessageToast.show("Only customers are allowed to use self check-in.");
                                                oEvent.getSource().setSelected(false);
                                                return;
                                            }
                                            // Already logged in → auto-fill
                                            aPersons.forEach((p, index) => {

                                                // ---------- COMMON FIELDS (ALL PERSONS) ----------
                                                p.CustomerEmail = oUser.EmailID || "";
                                                p.MobileNo = oUser.MobileNo || "";
                                                p.UserID = oUser.UserID || "";
                                                p.Country = oUser.Country || "";
                                                p.State = oUser.State || "";
                                                p.City = oUser.City || "";
                                                p.Address = oUser.Address || "";
                                                p.STDCode = oUser.STDCode || "";
                                                p.DateOfBirth = that.Formatter.DateFormat(oUser.DateOfBirth)
                                                    || "";

                                                // ---------- FIRST PERSON ONLY ----------
                                                if (index === 0) {
                                                    p.Salutation = oUser.Salutation || "";
                                                    p.FullName = oUser.EmployeeName || oUser.UserName || "";
                                                    p.DateOfBirth = oUser.DateOfBirth || that.Formatter.DateFormat(oUser.DateOfBirth);
                                                    p.Gender = oUser.Gender || "";
                                                }
                                                // ---------- REST PERSONS ----------
                                                else {
                                                    p.Salutation = "";
                                                    p.FullName = "";
                                                    p.DateOfBirth = "";
                                                    p.Gender = "";
                                                }
                                            });

                                        } else {
                                            aPersons.forEach(p => {
                                                p.Salutation = "";
                                                p.FullName = "";
                                                p.CustomerEmail = "";
                                                p.MobileNo = "";
                                                p.UserID = "";
                                                p.DateOfBirth = "";
                                                p.Gender = "";
                                                p.Country = "";
                                                p.State = "";
                                                p.City = "";
                                                p.Address = "";
                                                p.STDCode = "";
                                            });
                                        }

                                        oModel.refresh(true);
                                        that._applyCountryStateCityForPersons();
                                    }
                                })
                            ] :
                            []),
                        new sap.m.Label({
                            text: "{i18n>fullname}",
                            required: true,
                            maxLength: 40
                        }),
                        new sap.m.Select({
                            width: "100%",
                            selectedKey: "{HostelModel>/Persons/" + i + "/Salutation}",
                            items: [
                                new sap.ui.core.ListItem({
                                    key: "",
                                    text: ""
                                }),
                                new sap.ui.core.ListItem({
                                    key: "Mr.",
                                    text: "Mr"
                                }),
                                new sap.ui.core.ListItem({
                                    key: "Mrs.",
                                    text: "Mrs"
                                }),
                                new sap.ui.core.ListItem({
                                    key: "Ms.",
                                    text: "Ms"
                                }),
                                new sap.ui.core.ListItem({
                                    key: "Dr.",
                                    text: "Dr"
                                }),
                            ]
                        }),
                        new sap.m.Input({
                            placeholder: "Enter full name",
                            width: "100%",
                            value: "{HostelModel>/Persons/" + i + "/FullName}",
                            maxLength: 40,
                         liveChange: function (oEvent) {
    const oInput = oEvent.getSource();
    let sValue = oEvent.getParameter("value");

    // Allow only alphabets and spaces
    const sFilteredValue = sValue.replace(/[^a-zA-Z\s]/g, "");

    // Replace invalid characters immediately
    if (sValue !== sFilteredValue) {
        oInput.setValue(sFilteredValue);
    }

    // Empty is allowed (no error while typing)
    if (!sFilteredValue) {
        oInput.setValueState(sap.ui.core.ValueState.None);
        return;
    }

    //  Valid input → clear error
    oInput.setValueState(sap.ui.core.ValueState.None);
}



                        }),
                        new sap.m.Label({
                            text: "UserID",
                            required: true
                        }),
                        new sap.m.Input({
                            value: "{HostelModel>/Persons/" + i + "/UserID}",
                            editable: false,
                            visible: false
                        }),

                        new sap.m.Label({
                            text: "{i18n>MVDDOB}",
                            required: true
                        }),
                        new sap.m.DatePicker({
                            width: "100%",
                            value: "{HostelModel>/Persons/" + i + "/DateOfBirth}",
                            id: that.createId("ID_DOB_" + i),
                            formatter: that.DateFormat,
                            valueFormat: "dd/MM/yyyy",
                            displayFormat: "dd/MM/yyyy",
                            maxDate: new Date(new Date().getFullYear() - 10, 11, 31),
                            placeholder: "Select date of birth",
                            change: function (oEvent) {
                                const oDate = oEvent.getSource().getDateValue();
                                if (oDate > new Date()) {
                                    MessageToast.show(that.i18nModel.getText("dateofBirthcannotbeFuture"));
                                    oEvent.getSource().setValue("");
                                }
                            }

                        }),
                        new sap.m.Label({
                            text: "{i18n>MVgender}",
                            required: true,

                        }),
                        new sap.m.Select({

                            width: "100%",
                            selectedKey: "{HostelModel>/Persons/" + i + "/Gender}",
                            items: [
                                new sap.ui.core.ListItem({
                                    key: "",
                                    text: ""
                                }),
                                new sap.ui.core.ListItem({
                                    key: "Male",
                                    text: "Male"
                                }),
                                new sap.ui.core.ListItem({
                                    key: "Female",
                                    text: "Female"
                                }),
                                new sap.ui.core.ListItem({
                                    key: "Other",
                                    text: "Other"
                                })
                            ]
                        }),

                        new sap.m.Label({
                            text: "Email",
                            required: true,
                            type: "Email",

                        }),
                        new sap.m.Input({
                            placeholder: "Enter email",
                            width: "100%",
                            value: "{HostelModel>/Persons/" + i + "/CustomerEmail}",
                            liveChange: function (oEvent) {
                                const sValue = oEvent.getParameter("value");
                                const oInput = oEvent.getSource();
                                const oEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                if (sValue && !oEmailRegex.test(sValue)) {
                                    oInput.setValueState("Error");
                                    oInput.setValueStateText("Please enter a valid email address");
                                } else {
                                    oInput.setValueState("None");
                                }
                            }
                        }),

                        new sap.m.Label({
                            text: "Country",
                            required: true,
                        }),

                        new sap.m.ComboBox({
                            placeholder: "Select country",
                            width: "100%",
                            selectedKey: "{HostelModel>/Persons/" + i + "/Country}",
                            showSecondaryValues: true,
                            items: {
                                path: "CountryModel>/",
                                length: 1000, showSecondaryValues: true,
                                template: new sap.ui.core.ListItem({
                                    key: "{CountryModel>countryName}",
                                    text: "{CountryModel>countryName}",
                                    additionalText: "{CountryModel>code}"  // country code
                                })
                            },
                            change: function (oEv) {
                                const oSel = oEv.getSource().getSelectedItem();
                                const aPersons = oModel.getProperty("/Persons");

                                // Clear dependents
                                aPersons[i].State = "";
                                aPersons[i].City = "";
                                aPersons[i].STDCode = "";
                                aPersons[i].MobileMax = undefined; // reset

                                if (!oSel) {
                                    oModel.refresh(true);
                                    return;
                                }

                                const oCountryObj = oSel.getBindingContext("CountryModel").getObject();
                                const sCountryCode = oCountryObj.code;
                                const sSTDCode = oCountryObj.stdCode;

                                aPersons[i].Country = oCountryObj.countryName;
                                aPersons[i].STDCode = sSTDCode;

                                // Decide mobile max based on country (store on model)
                                if (oCountryObj.countryName === "India") {
                                    aPersons[i].MobileMax = 10;
                                } else {
                                    aPersons[i].MobileMax = 18; // or any other rule
                                }


                                const bAnyIndia = aPersons.some(p => p.Country === "India");
                                oModel.setProperty("/IsIndia", bAnyIndia);

                                // Filter states (existing logic)
                                const oStateCombo = sap.ui.getCore().byId(that.createId("ID_State_" + i));
                                oStateCombo.getBinding("items").filter([
                                    new Filter("countryCode", FilterOperator.EQ, sCountryCode)
                                ]);

                                // Also set UI input maxLength for immediate UX feedback if input exists
                                const oMobileInput = sap.ui.getCore().byId(that.createId("ID_Mobile_" + i));
                                if (oMobileInput) {
                                    oMobileInput.setMaxLength(aPersons[i].MobileMax);
                                    sap.ui.getCore().applyChanges();
                                }

                                // Persist change to model
                                oModel.setProperty("/Persons", aPersons);
                                oModel.refresh(true);
                            }
                        }),

                        new sap.m.Label({
                            text: "State",
                            required: true,
                        }),
                        new sap.m.ComboBox({
                            placeholder: "Select state",
                            width: "100%",
                            id: that.createId("ID_State_" + i),
                            selectedKey: "{HostelModel>/Persons/" + i + "/State}",
                            showSecondaryValues: true,
                            items: {
                                path: "StateModel>/", length: 1000, showSecondaryValues: true,
                                template: new sap.ui.core.ListItem({
                                    key: "{StateModel>stateName}",
                                    text: "{StateModel>stateName}",
                                    additionalText: "{StateModel>countryCode}"
                                })
                            },
                            change: function (oEv) {
                                const oSel = oEv.getSource().getSelectedItem();
                                const aPersons = oModel.getProperty("/Persons");
                                aPersons[i].State = "";

                                if (!oSel) {
                                    oModel.refresh(true);
                                    return;
                                }

                                const sStateName = oSel.getText();
                                aPersons[i].State = sStateName;
                                const oCountryName = aPersons[i].Country;
                                const oCountryData = that.getView().getModel("CountryModel").getData();
                                const oCountryObj = oCountryData.find(x => x.countryName === oCountryName);

                                // Filter cities
                                const oCityCombo = sap.ui.getCore().byId(that.createId("ID_City_" + i));
                                oCityCombo.getBinding("items").filter([
                                    new Filter("stateName", FilterOperator.EQ, sStateName),
                                    new Filter("countryCode", FilterOperator.EQ, oCountryObj?.code)
                                ]);
                                oModel.refresh(true);
                            }
                        }),

                        new sap.m.Label({
                            text: "City",
                            required: true,
                        }),

                        new sap.m.ComboBox({
                            placeholder: "Select city",
                            width: "100%",
                            id: that.createId("ID_City_" + i),
                            selectedKey: "{HostelModel>/Persons/" + i + "/City}",
                            showSecondaryValues: true,
                            items: {
                                path: "CityModel>/",
                                length: 1000,
                                template: new sap.ui.core.ListItem({
                                    key: "{CityModel>cityName}",
                                    text: "{CityModel>cityName}",
                                    additionalText: "{CityModel>branchCode}"
                                })
                            },
                            change: function (oEvent) {
                                const oSource = oEvent.getSource();
                                const oSelectedItem = oSource.getSelectedItem();
                                const sValue = oSource.getValue(); // <-- typed OR selected text

                                const aPersons = oModel.getProperty("/Persons");

                                // If item selected from list
                                if (oSelectedItem) {
                                    aPersons[i].City = oSelectedItem.getText();
                                }
                                // If user typed a custom value
                                else {
                                    aPersons[i].City = sValue;
                                }

                                oModel.setProperty("/Persons", aPersons);
                            }
                        }),

                        new sap.m.Label({
                            text: "Mobile No",
                            required: true,
                        }),

                        new sap.m.ComboBox({
                            placeholder: "STD code",
                            id: that.createId("ID_STDCode_" + i),

                            selectedKey: "{HostelModel>/Persons/" + i + "/STDCode}",

                            showSecondaryValues: true,
                            filterSecondaryValues: true,

                            items: {
                                path: "CountryModel>/",
                                length: 1000,
                                template: new sap.ui.core.ListItem({
                                    key: "{CountryModel>stdCode}",
                                    text: "{CountryModel>stdCode}",
                                    additionalText: "{CountryModel>code}"
                                })
                            },

                            change: function (oEv) {
                                const oCombo = oEv.getSource();
                                const oItem = oCombo.getSelectedItem();

                                if (!oItem) {
                                    oCombo.setSelectedKey("");
                                    oCombo.setValueState("Error");
                                    oCombo.setValueStateText("Please select a valid STD Code");
                                    return;
                                }

                                oCombo.setValueState("None");

                                const oSTDObj = oItem.getBindingContext("CountryModel").getObject();
                                const sSTDCode = oSTDObj.stdCode;

                                const aPersons = oModel.getProperty("/Persons") || [];

                                const iMobileMax = (sSTDCode === "+91") ? 10 : 18;

                                aPersons[i].STDCode = sSTDCode;
                                aPersons[i].MobileMax = iMobileMax;

                                oModel.setProperty("/Persons", aPersons);

                                const oMobileInput = sap.ui.getCore().byId(
                                    that.createId("ID_Mobile_" + i)
                                );

                                if (oMobileInput) {
                                    oMobileInput.setMaxLength(iMobileMax);

                                    let sValue = oMobileInput.getValue() || "";
                                    if (sValue.length > iMobileMax) {
                                        sValue = sValue.substring(0, iMobileMax);
                                        oMobileInput.setValue(sValue);
                                        oModel.setProperty("/Persons/" + i + "/MobileNo", sValue);
                                    }
                                }
                            }
                        }),

                        new sap.m.Input({
                            placeholder: "Enter mobile number",
                            width: "100%",
                            id: that.createId("ID_Mobile_" + i),
                            value: "{HostelModel>/Persons/" + i + "/MobileNo}",
                            type: "Number", maxLength: 20,
                            liveChange: function (oEv) {
                                const oInput = oEv.getSource();
                                let sValue = oInput.getValue() || "";

                                sValue = sValue.replace(/\D/g, ""); // allow only digits

                                const aPersons = oModel.getProperty("/Persons") || [];
                                const person = aPersons[i] || {};
                                const maxLengthFromModel = person.MobileMax || oInput.getMaxLength() || 20; // fallback

                                if (sValue.length > maxLengthFromModel) {
                                    sValue = sValue.substring(0, maxLengthFromModel);
                                }

                                oInput.setValue(sValue);
                                oInput.setValueState("None");
                                oInput.setValueStateText("");

                                const sCountry = person.Country || "";

                                // Country-specific validations
                                if (sCountry === "India") {

                                    // update model value for MobileNo
                                    oModel.setProperty("/Persons/" + i + "/MobileNo", sValue);
                                    return;
                                }

                                // Other countries: minimum 4 digits (example rule)
                                if (sValue.length < 4) {
                                    oInput.setValueState("Error");
                                    oInput.setValueStateText(that.i18nModel.getText("mobileNumbermustbeatleastDigits"));
                                }

                                // update model value for MobileNo
                                oModel.setProperty("/Persons/" + i + "/MobileNo", sValue);
                            }
                        }),

                        new sap.m.Label({
                            text: "Address",
                            required: true
                        }),
                        new sap.m.TextArea({
                            placeholder: "Enter address",
                            width: "100%",
                            value: "{HostelModel>/Persons/" + i + "/Address}",
                            placeholder: "Enter permanent address",
                            rows: 3,
                            maxLength: 100
                        })
                    ]
                });

                // ---- Document Upload Section ----
                const oDocument = new sap.ui.layout.form.SimpleForm({
                    editable: true,
                    title: "Document Upload",
                    layout: "ColumnLayout",
                    adjustLabelSpan: false,
                    labelSpanXL: 4,
                    labelSpanL: 3,
                    labelSpanM: 4,
                    columnsXL: 2,
                    columnsL: 2,
                    columnsM: 1,
                    content: [
                        new sap.m.Label({
                            text: "Document Type"
                        }),
                        new sap.m.ComboBox({
                            placeholder: "Select document type",
                            width: "100%",
                            maxLength: 30,
                            selectedKey: "{HostelModel>/Persons/" + i + "/DocumentType}",
                            items: [
                                new sap.ui.core.ListItem({
                                    key: "Aadhar Card",
                                    text: "Aadhar Card"
                                }),
                                new sap.ui.core.ListItem({
                                    key: "Pan Card",
                                    text: "Pan Card"
                                }),
                                new sap.ui.core.ListItem({
                                    key: "Driving License",
                                    text: "Driving License"
                                }),
                                new sap.ui.core.ListItem({
                                    key: "Passport",
                                    text: "Passport"
                                })
                            ]
                        }),
                        new sap.m.Label({
                            text: "Upload ID Proof"
                        }),
                        new sap.ui.unified.FileUploader({
                            placeholder: "Choose file",
                            width: "100%",
                            fileType: ["jpg", "jpeg", "png", "pdf"],
                            mimeType: ["image/jpeg", "image/png", "application/pdf"],
                            multiple: false,
                            layoutData: new sap.ui.layout.form.ColumnElementData({
                                cellsLarge: 7, ///8
                                cellsSmall: 8 ///9
                            }),
                            customData: [new sap.ui.core.CustomData({
                                key: "index",
                                value: i
                            })],
                            change: function (oEvent) {
                                const oUploader = oEvent.getSource();
                                const index = parseInt(oUploader.data("index"), 10);
                                const oFile = oEvent.getParameter("files")[0];

                                if (!oFile) {
                                    return;
                                }

                                // 🔹 Get Document Type from the same model used in binding
                                const sDocType = oModel.getProperty("/Persons/" + index + "/DocumentType");

                                //  Validation: Document Type must be selected
                                if (!sDocType) {
                                    MessageBox.error(that.i18nModel.getText("pleaseselectDocumentTypebeforeuploading"));

                                    // Reset FileUploader
                                    oUploader.clear();
                                    return;
                                }

                                //  File size validation (2 MB)
                                const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
                                if (oFile.size > MAX_SIZE) {
                                    MessageBox.error(
                                        "File size must be less than 2 MB.\nSelected file size: " +
                                        (oFile.size / 1024 / 1024).toFixed(2) + " MB"
                                    );

                                    oUploader.clear();
                                    return;
                                }

                                const reader = new FileReader();

                                reader.onload = function (e) {
                                    const sBase64 = e.target.result;

                                    // Clear previous documents
                                    oData.Persons[index].Documents = [];

                                    // Thumbnail logic
                                    let sThumbnail = sBase64;
                                    if (oFile.type === "application/pdf") {
                                        sThumbnail = "sap-icon://pdf-attachment";
                                    }

                                    // Push document
                                    oData.Persons[index].Documents.push({
                                        FileName: oFile.name,
                                        FileType: oFile.type,
                                        Document: sBase64,
                                        Thumbnail: sThumbnail,
                                        DocumentType: sDocType
                                    });

                                    oModel.refresh(true);
                                };

                                reader.readAsDataURL(oFile);
                            }
                        }),

                        (new sap.m.Button({
                            text: "Clear",
                            type: "Transparent",
                            tooltip: "Clear Document",
                            layoutData: new sap.ui.layout.form.ColumnElementData({
                                cellsLarge: 2, ///1
                                cellsSmall: 4 /// 3
                            }),
                            press: function (oEvent) {

                                const oButton = oEvent.getSource();

                                // Traverse backwards until we find FileUploader
                                let oUploader = null;
                                let oParent = oButton.getParent();

                                while (oParent) {
                                    if (oParent instanceof sap.ui.unified.FileUploader) {
                                        oUploader = oParent;
                                        break;
                                    }
                                    if (oParent.getContent) {
                                        const aContent = oParent.getContent();
                                        oUploader = aContent.find(c => c instanceof sap.ui.unified.FileUploader);
                                        if (oUploader) break;
                                    }
                                    oParent = oParent.getParent();
                                }

                                if (!oUploader) {
                                    MessageToast.show(that.i18nModel.getText("unablelocateuploader"));
                                    return;
                                }

                                const index = oUploader.data("index");

                                // 1️⃣ Clear model data
                                oModel.setProperty("/Persons/" + index + "/Documents", []);
                                oModel.setProperty("/Persons/" + index + "/DocumentType", "");

                                // 2️⃣ Clear uploader UI
                                oUploader.clear();

                                // 3 Refresh model
                                oModel.refresh(true);
                            }
                        })).addStyleClass("myUnifiedBtn"),

                    ]
                });

                /** ---- FACILITIES SECTION (card layout) ---- **/
                const oFacilities = new sap.m.Panel({
                    headerText: "Facilities",
                    expandable: true,
                    expanded: true,
                    content: [
                        ...(i === 0 && iPersons > 1 ? [
                            new sap.m.CheckBox({
                                text: "Select For All Person",
                                selected: !!oData.ForBothSelected,
                                select: function (e) {
                                    const bSel = e.getParameter("selected");
                                    const aPersons = oData.Persons || [];
                                    oData.ForBothSelected = bSel;
                                    // CHECKBOX CHECKED (Copy Person 1 -> All)
                                    if (bSel) {

                                        const master = aPersons[0].Facilities.SelectedFacilities.map(f => ({ ...f }));

                                        for (let p = 1; p < iPersons; p++) {
                                            aPersons[p].Facilities.SelectedFacilities = master.map(f => ({ ...f }));
                                        }

                                        oModel.setProperty("/Persons", aPersons);
                                        oModel.refresh(true);

                                        // After UI render → Apply selection styles for all persons
                                        setTimeout(() => {
                                            $(".serviceCard").each(function () {

                                                const domId = $(this).attr("id");
                                                const ctrl = sap.ui.getCore().byId(domId);
                                                if (!ctrl) return;

                                                const ctx = ctrl.getBindingContext("FacilityModel");
                                                if (!ctx) return;

                                                const facilityObj = ctx.getObject();
                                                const found = master.find(f => f.FacilityName === facilityObj.FacilityName);

                                                if (found) {
                                                    ctrl.addStyleClass("serviceCardSelected");
                                                } else {
                                                    ctrl.removeStyleClass("serviceCardSelected");
                                                }
                                            });
                                        }, 120);

                                        return;
                                    }

                                    // -------------------------
                                    // CHECKBOX UNCHECKED (Clear All Others, Fix UI)
                                    // -------------------------
                                    // 1) Clear facilities for persons except Person 1
                                    for (let p = 1; p < iPersons; p++) {
                                        aPersons[p].Facilities.SelectedFacilities = [];
                                    }

                                    oModel.setProperty("/Persons", aPersons);
                                    oModel.refresh(true);

                                    // 2) Fix UI highlight → Only keep Person 1’s selected items
                                    setTimeout(() => {
                                        const firstSelected = aPersons[0].Facilities.SelectedFacilities;

                                        $(".serviceCard").each(function () {
                                            const domId = $(this).attr("id");
                                            const ctrl = sap.ui.getCore().byId(domId);
                                            if (!ctrl) return;

                                            const ctx = ctrl.getBindingContext("FacilityModel");
                                            if (!ctx) return;

                                            const facilityObj = ctx.getObject();

                                            // Check if this card belongs to person 1’s selected list
                                            const stillSelected = firstSelected.some(
                                                f => f.FacilityName === facilityObj.FacilityName
                                            );

                                            if (stillSelected) {
                                                ctrl.addStyleClass("serviceCardSelected");  // KEEP selected
                                            } else {
                                                ctrl.removeStyleClass("serviceCardSelected"); // REMOVE highlight
                                            }
                                        });
                                    }, 120);
                                }
                            })
                        ] : []),
                        new sap.m.HBox({
                            justifyContent: "Start",
                            items: [
                                new sap.m.MessageStrip({
                                    text: "Select a facility by clicking on the image",
                                    type: sap.ui.core.MessageType.Information,
                                    showIcon: true,
                                    showCloseButton: false,
                                    width: "auto"
                                })
                            ]
                        }).addStyleClass("sapUiSmallMarginBottom"),

                        new sap.m.FlexBox({
                            wrap: "Wrap",
                            alignItems: "Start",
                            alignContent: "Start",      // IMPORTANT when wrap is enabled
                            justifyContent: "Start",
                            items: {
                                path: "FacilityModel>/Facilities",
                                filters: [
                                    new Filter(
                                        "BranchCode",
                                        FilterOperator.EQ,
                                        oModel.getProperty("/BranchCode")
                                    )
                                ],
                                template: new sap.m.VBox({
                                    width: "290px",
                                    height: "auto",
                                    alignItems: "Center",
                                    justifyContent: "Center", //Center

                                    items: [
                                        // Facility Image + Overlay Name
                                        new sap.m.VBox({
                                            width: "264px",
                                            height: "178px",
                                            styleClass: "imageContainer",
                                            items: [
                                                new sap.m.HBox({
                                                    visible: {
                                                        parts: [
                                                            { path: "FacilityModel>FacilityName" },
                                                            { path: "HostelModel>/Persons/" + i + "/Facilities/SelectedFacilities" }
                                                        ],
                                                        formatter: function (name, selected) {
                                                            return !!selected?.find(f => f.FacilityName === name);
                                                        }
                                                    },
                                                    items: [
                                                        new sap.m.Text({ text: "ADDED" })
                                                    ]
                                                }).addStyleClass("selectedBadge"),
                                                new sap.m.Image({
                                                    src: "{FacilityModel>Image}",
                                                    width: "264px",
                                                    height: "178px",
                                                    // class: "serviceImage",
                                                    densityAware: false,
                                                    wrap: true,
                                                    press: function (oEvent) {
                                                        const oCtx = oEvent.getSource().getBindingContext("FacilityModel");
                                                        const facility = oCtx.getObject();
                                                        const oCard = oEvent.getSource().getParent().getParent();
                                                        const iPersonIndex = i;

                                                        const oModel = that.getView().getModel("HostelModel");
                                                        const aPersons = oModel.getProperty("/Persons") || [];
                                                        const aSelected = aPersons[iPersonIndex].Facilities.SelectedFacilities;

                                                        // Check if facility already selected
                                                        const existsIndex = aSelected.findIndex(
                                                            f => f.FacilityID === facility.FacilityID
                                                        );

                                                        // If selected → REMOVE it
                                                        if (existsIndex > -1) {

                                                            aSelected.splice(existsIndex, 1);

                                                            //  Force summary recalculation
                                                            aPersons[iPersonIndex].PersonFacilitiesSummary = [];
                                                            aPersons[iPersonIndex].AllSelectedFacilities = [];
                                                            aPersons[iPersonIndex].TotalFacilityPrice = 0;
                                                            aPersons[iPersonIndex].GrandTotal = 0;
                                                            that._bPricingDirty = true;

                                                            oCard.removeStyleClass("serviceCardSelected");

                                                            // If select-for-all ON and first person
                                                            if (oModel.getProperty("/ForBothSelected") && iPersonIndex === 0) {
                                                                for (let p = 1; p < aPersons.length; p++) {

                                                                    let other = aPersons[p].Facilities.SelectedFacilities;
                                                                    let removeIdx = other.findIndex(
                                                                        f => f.FacilityName === facility.FacilityName
                                                                    );
                                                                    if (removeIdx > -1) other.splice(removeIdx, 1);
                                                                }
                                                            }
                                                            oModel.setProperty("/HasFacilitySelection",
                                                                aPersons.some(p => p.Facilities.SelectedFacilities.length > 0)
                                                            );

                                                            oModel.refresh(true);
                                                            return;
                                                        }

                                                        // If NOT selected → open popover to choose price
                                                        const oActionSheet = that._createFacilityPopover(facility, iPersonIndex, oCard);
                                                        oActionSheet.openBy(oEvent.getSource());
                                                    }
                                                }).addStyleClass("serviceImage"),


                                                // Replace HTML formatter with:
                                                new sap.m.Text({
                                                    text: "{FacilityModel>FacilityName}",
                                                    textAlign: "Center"
                                                }).addStyleClass("facilityOverlayText")



                                            ]
                                        }),

                                        // Facility Price (below the image)
                                        new sap.m.Text({
                                            visible: {
                                                parts: [
                                                    { path: "FacilityModel>FacilityName" },
                                                    { path: "HostelModel>/Persons/" + i + "/Facilities/SelectedFacilities" }
                                                ],
                                                formatter: function (name, selected) {
                                                    // Agar selected nahi hai toh text hide kar do, taaki space na le
                                                    return !!(selected && selected.find(f => f.FacilityName === name));
                                                }
                                            },
                                            text: {
                                                parts: [
                                                    { path: "FacilityModel>FacilityName" },
                                                    { path: "HostelModel>/Persons/" + i + "/Facilities/SelectedFacilities" }
                                                ],
                                                formatter: function (facilityName, aSelectedFacilities) {
                                                    if (!aSelectedFacilities || !facilityName) return "";
                                                    const found = aSelectedFacilities.find(f => f.FacilityName === facilityName);
                                                    return found ? (found.SelectedPriceType + " - " + found.SelectedPrice + " " + (found.Currency || "")) : "";
                                                }
                                            }
                                        }).addStyleClass("facilityPriceText")


                                    ]
                                }).addStyleClass("serviceCard"),
                            }
                        })
                    ],
                    visible: {
                        path: "HostelModel>/ForBothSelected",
                        formatter: function (bSel) {
                            if (bSel && i > 0) return false;
                            return true;
                        }
                    }
                });


                // Add sections for each person
                oVBox.addItem(oForm);

                oVBox.addItem(oDocument);

                oVBox.addItem(oFacilities);
            }
            if (oFacilityModel) oFacilityModel.refresh(true);
            setTimeout(() => {
                BusyIndicator.hide();
            }, 2000);

            if (oModel) oModel.refresh(true);


        },

        _createFacilityPopover: function (facility, iPersonIndex, oCard) {

            const SelectedPriceType =
                this.getView().getModel("HostelModel").getProperty("/SelectedPriceType");

            const that = this;

            if (this._oFacilityPopover) {
                this._oFacilityPopover.destroy();
            }

            const aButtons = [];

            function addButton(price, label) {

                const num = Number(price);

                if (price !== "" && price !== null && Number.isFinite(num) && num > 0) {

                    aButtons.push(
                        new sap.m.Button({
                            width: "100%",
                            text: `${label} – ${num} ${facility.Currency}`,
                            type: "Transparent",
                            press: function () {
                                that._setFacilitySelectedPrice(
                                    facility,
                                    label,
                                    num,
                                    iPersonIndex,
                                    oCard
                                );
                                that._oFacilityPopover.close();
                            }
                        })
                    );
                }
            }

            if (SelectedPriceType === "Per Day") {
                addButton(facility.PricePerDay, "Per Day");
            } else if (SelectedPriceType === "Per Month") {
                addButton(facility.PricePerMonth, "Per Month");
            } else if (SelectedPriceType === "Per Year") {
                addButton(facility.PricePerYear, "Per Year");
            }

            this._oFacilityPopover = new sap.m.Popover({
                placement: sap.m.PlacementType.Top,
                showHeader: false,
                contentWidth: "220px",
                content: aButtons
            });

            this.getView().addDependent(this._oFacilityPopover);

            return this._oFacilityPopover;
        },

        _setFacilitySelectedPrice: function (facility, selectedType, selectedPrice, iPersonIndex, oCard) {

            const oModel = this.getView().getModel("HostelModel");
            const aPersons = oModel.getProperty("/Persons");
            const selectedMonths =
                Number(oModel.getProperty("/SelectedMonths")) || 1;

            let aSelected =
                aPersons[iPersonIndex].Facilities.SelectedFacilities;

            const idx = aSelected.findIndex(
                f => f.FacilityName === facility.FacilityName
            );

            const oNew = {
                FacilityName: facility.FacilityName,
                BranchCode: facility.BranchCode,
                Currency: facility.Currency,
                Image: facility.Image,
                SelectedPrice: selectedPrice,
                SelectedPriceType: selectedType
            };
            // if (selectedType === "Per Hour") {
            //     MessageBox.information(
            //         "The default Start Time is 09:00 AM and End Time is 10:00 AM.\nIf you want to change it, Please Edit it in the Summary Section.",
            //         { title: "Default Time Applied" }
            //     );
            // }

            if (idx > -1) {
                aSelected[idx] = oNew;
            } else {
                aSelected.push(oNew);
            }

            if (oModel.getProperty("/ForBothSelected") && iPersonIndex === 0) {
                for (let p = 1; p < aPersons.length; p++) {
                    aPersons[p].Facilities.SelectedFacilities =
                        aSelected.map(f => ({ ...f }));
                }
            }
            this._bPricingDirty = true;

            const sStartDate = oModel.getProperty("/StartDate");
            const sEndDate = oModel.getProperty("/EndDate");
            const baseRoomRent = Number(oModel.getProperty("/FinalPrice")) || 0;

            // 🔁 RECALCULATE
            const result = this.calculateTotals(
                aPersons,
                sStartDate,
                sEndDate,
                baseRoomRent
            );

            oModel.setProperty("/Persons", result.Persons);
            oModel.setProperty("/GrandTotal", result.GrandTotal);

            setTimeout(() => {
                if (oCard?.addStyleClass) {
                    oCard.addStyleClass("serviceCardSelected");
                }
            }, 0);


            // 🔁 Rebuild AllSelectedFacilities from all persons
            // Ensure duration values exist
            aPersons[iPersonIndex].TotalDays = 30;
            aPersons[iPersonIndex].SelectedMonths = selectedMonths;


            let aAll = [];

            const defaultMonths =
                Number(oModel.getProperty("/SelectedMonths")) || 1;

            aPersons.forEach((person, personIdx) => {
                if (person.Facilities?.SelectedFacilities) {
                    person.Facilities.SelectedFacilities.forEach(facility => {

                        // 🔥 Ensure months exist
                        if (!facility.SelectedMonths) {
                            facility.SelectedMonths = defaultMonths;
                        }

                        aAll.push({
                            FacilityName: facility.FacilityName,
                            UnitText: facility.SelectedPriceType,
                            SelectedPriceType: facility.SelectedPriceType,
                            PersonIndex: personIdx,
                            Currency: facility.Currency,
                            SelectedPrice: facility.SelectedPrice,

                            TotalDays: person.TotalDays || 1,
                            SelectedMonths: facility.SelectedMonths,
                            IsDurationEdited: facility.IsDurationEdited
                        });
                    });
                }
            });


            oModel.setProperty("/AllSelectedFacilities", aAll);
            oModel.refresh(true);

        }
        ,

        onPersonCountChange: function (oEvent) {
            const oModel = this.getView().getModel("HostelModel");
            const iPersonCount = oModel.getProperty("/SelectedPerson") || 1;

            if (this._lastPersonCount !== iPersonCount) {
                this._mustRecreatePersonUI = true;
                this._lastPersonCount = iPersonCount;
            }
        },

        onDialogNextButton: async function () {
            const oModel1 = this.getView().getModel("HostelModel");
            if (oModel1) {
                oModel1.refresh(true); // ensure latest input values are in model
            }

            const aErrorControls = sap.ui.getCore().byFieldGroupId
                ? sap.ui.getCore().byFieldGroupId("HostelValidationGroup") || []
                : [];

            let bHasError = false;

            // Fallback: scan entire view (SAFE for dynamic controls)
            if (aErrorControls.length === 0) {
                this.getView().findAggregatedObjects(true, function (oControl) {
                    if (oControl.getValueState && oControl.getValueState() === sap.ui.core.ValueState.Error) {
                        bHasError = true;
                        return true; // stop scan
                    }
                    return false;
                });
            } else {
                bHasError = aErrorControls.some(c =>
                    c.getValueState && c.getValueState() === sap.ui.core.ValueState.Error
                );
            }

            const oModel = this.getView().getModel("HostelModel");
            const sCurrentBranch = oModel.getProperty("/BranchCode");

            if (
                !this._isPersonUIInitialized ||
                this._mustRecreatePersonUI ||
                this._lastRenderedBranch !== sCurrentBranch
            ) {
                this._createDynamicPersonsUI();

                this._isPersonUIInitialized = true;
                this._mustRecreatePersonUI = false;
                this._lastRenderedBranch = sCurrentBranch;
            }


            // STEP 1: validations
            if (this._iSelectedStepIndex === 1) {
                const aMissing = this._checkMandatoryFields();
                const aMessages = this.getView().getModel("message")?.getProperty("/") || [];

                if (aMissing.length > 0 || aMessages.length > 0) {
                    MessageToast.show("Please review the errors and fix them");

                    const oMessageButton = this.byId("messagePopoverBtn");
                    if (oMessageButton) {
                        oMessageButton.addEventDelegate({
                            onAfterRendering: () => {
                                this._openMessagePopover(oMessageButton);
                            }
                        });
                    }
                    return;
                }
            }



            if (!this._oSelectedStep) {
                this._oSelectedStep = this._oWizard.getCurrentStep();
            }

            const aSteps = this._oWizard.getSteps();
            let iIndex = aSteps.indexOf(this._oSelectedStep);
            if (iIndex === -1) {
                iIndex = aSteps.indexOf(this._oWizard.getCurrentStep());
            }

            this._iSelectedStepIndex = iIndex;
            this.oNextStep = aSteps[iIndex + 1];

            if (this._oSelectedStep && !this._oSelectedStep.bLast) {
                this._oWizard.goToStep(this.oNextStep, true);
            } else {
                this._oWizard.nextStep();
            }
            this._iSelectedStepIndex++;
            this._oSelectedStep = this.oNextStep;

            this.handleButtonsVisibility();
        },
        onMessagePopoverPress: function (oEvent) {
            this._openMessagePopover(oEvent.getSource());
        },
        _openMessagePopover: function (oSource) {

             if (this._iSelectedStepIndex === 0) {
        return;
    }
            if (!this._oMessagePopover) {
                this._oMessagePopover = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "sap.ui.com.project1.fragment.MessagePopOver",
                    this
                );
                this.getView().addDependent(this._oMessagePopover);
            }

            this._oMessagePopover.openBy(oSource);
        },

        _resetCouponAndDiscount: function () {
            const oModel = this.getView().getModel("HostelModel");
            // Clear coupon & discount UI
            oModel.setProperty("/CouponCode", "");
            oModel.setProperty("/AppliedDiscount", 0);
            oModel.setProperty("/CouponButtonVisible", true);
            //  Skip totals recalculation if user is still on Step 0 or Step 1
            if (this._iSelectedStepIndex < 2) {
                // Only reset discount value, do NOT calculate totals yet
                oModel.refresh(true);
                return;
            }
            var inputID = this.getCore().byId("BookingcouponInput")
            inputID.setShowValueHelp(false)

            // From Step 2 onward — now calculate totals safely
            const aPersons = oModel.getProperty("/Persons") || [];
            const roomRent = oModel.getProperty("/RoomRent") || 0;

            const result = this.calculateTotals(aPersons, roomRent);

            oModel.setProperty("/OverallTotalCost", result.GrandTotal);
            oModel.setProperty("/CGST", result.CGST);
            oModel.setProperty("/SGST", result.SGST);
            oModel.setProperty("/FinalTotalCost", result.FinalTotal);

            // Reset button text
            oModel.refresh(true);
        },

        onDialogBackButton: function () {
       
            this._iSelectedStepIndex = this._oWizard.getSteps().indexOf(this._oSelectedStep);
            var oPreviousStep = this._oWizard.getSteps()[this._iSelectedStepIndex - 1];
               
            if (this._oSelectedStep) {
                this._oWizard.goToStep(oPreviousStep, true);
            } else {
                this._oWizard.previousStep();
            }
         
            this._iSelectedStepIndex--;
            this._oSelectedStep = oPreviousStep;

 if (this._iSelectedStepIndex === 0) {

        this._bBlockMessagePopover = true;

        if (this._oMessagePopover) {
            this._oMessagePopover.close();
        }
    } else {
        this._bBlockMessagePopover = false;
    }
             this.handleButtonsVisibility();
        },

        handleNavigationChange: function (oEvent) {
            this._oWizard = this.byId("TC_id_wizard");
            const oTargetStep = oEvent.getParameter("step");
            const aSteps = this._oWizard.getSteps();
            const iTargetIndex = aSteps.indexOf(oTargetStep);
            const oHostelModel = this.getView().getModel("HostelModel");

            // STEP 1 REQUIRED FIELDS
            const bStep1Valid = !!(
                oHostelModel.getProperty("/StartDate") &&
                oHostelModel.getProperty("/EndDate") &&
                oHostelModel.getProperty("/SelectedPriceType") &&
                oHostelModel.getProperty("/SelectedPerson")
            );

            if (this._iSelectedStepIndex === 1) {
                this._resetCouponAndDiscount();

            }

            //  BLOCK HEADER JUMP IF STEP 1 INVALID
            if (iTargetIndex > 0 && !bStep1Valid) {
                MessageToast.show(this.i18nModel.getText("pleasecompleteBookingInformationbeforeproceeding"));

                this._resetWizardFromStep1();
                return;
            }
            if (this._mustRecreatePersonUI) {
                this._createDynamicPersonsUI();
                this._mustRecreatePersonUI = false;
            }

            //  Normal navigation
            this._oSelectedStep = oTargetStep;
            this._iSelectedStepIndex = iTargetIndex;

            setTimeout(function () {
                var oWizardDom = this._oWizard.getDomRef();
                if (oWizardDom) {
                    oWizardDom.scrollTop = 0;
                }
            }.bind(this), 0);
            this.handleButtonsVisibility();
        },

        _validateGeneralInfo: function () {
            const oView = this.getView();
            const oHostelModel = oView.getModel("HostelModel");
            const oBTN = oView.getModel("OBTNModel");
            const oWizard = this.byId("TC_id_wizard");

            if (!oWizard) {
                return;
            }

            const aSteps = oWizard.getSteps();
            const oStepGeneral = aSteps[0];   // Step 1
            const oStepPersonal = aSteps[1];  // Step 2

            // Read required fields of Step 1
            const sStartDate = oHostelModel.getProperty("/StartDate");
            const sEndDate = oHostelModel.getProperty("/EndDate");
            const sPaymentType = oHostelModel.getProperty("/SelectedPriceType");
            const sPerson = oHostelModel.getProperty("/Person");

            // Step-1 validity rule
            const bValid = !!(sStartDate && sEndDate && sPaymentType && sPerson);

            // ===============================
            // MODEL STATE
            // ===============================
            oHostelModel.setProperty("/IsGeneralInfoValid", bValid);

            // ===============================
            // FOOTER BUTTON STATE
            // ===============================
            oBTN.setProperty("/Next", bValid);
            oBTN.setProperty("/Submit", false);

            // ===============================
            // WIZARD STATE
            // ===============================
            oStepGeneral.setValidated(bValid);

            //  THIS CONTROLS HEADER CLICKABILITY
            oStepPersonal.setEnabled(bValid);

            // If invalid → force user back to Step 1
            if (!bValid) {
                oWizard.goToStep(oStepGeneral, true);
                this._iSelectedStepIndex = 0;
                this._oSelectedStep = oStepGeneral;
            }
        },

        handleButtonsVisibility: function () {
            var oModel = this.getView().getModel("OBTNModel");
            oModel.setProperty("/Submit", false);
            oModel.setProperty("/Cancel", false);
            switch (this._iSelectedStepIndex) {
                case 0:
                    oModel.setProperty("/NXTVis", true);
                    oModel.setProperty("/PERVIOUSVIS", false);
                  
                    break;
                case 1:
                    oModel.setProperty("/PERVIOUSVIS", true);
                    oModel.setProperty("/NXTVis", true);
                    try {
                        // First try to get the Select control and call handler with a fake event
                        const oSelect = this.getView().byId("id_Noofperson1");
                        if (oSelect) {
                            // call original handler with a synthetic event object that provides getSource()
                            if (!this._isPersonUIInitialized) {
                                this.onNoOfPersonSelect({ getSource: function () { return oSelect; } });
                            }

                        } else {
                            this.onNoOfPersonSelect();
                        }
                    } catch (e) {
                    }
                    this._LoadFacilities()
                    break;
                case 2:

                    oModel.setProperty("/Submit", true);
                    oModel.setProperty("/Cancel", true);
                    oModel.setProperty("/NXTVis", false);
                    oModel.setProperty("/PERVIOUSVIS", false);

                    if (this._bPricingDirty) {
                        this.TC_onDialogNextButton();
                        this._bPricingDirty = false;   // reset after calculation
                    }

                    break;
                default:
                    break;
            }
        },

        _resetWizardFromStep1: function () {
            const oWizard = this.byId("TC_id_wizard");
            const aSteps = oWizard.getSteps();
            const oBTN = this.getView().getModel("OBTNModel");
            const oHostelModel = this.getView().getModel("HostelModel");

            const oStep1 = aSteps[0];
            const oStep2 = aSteps[1];
            const oStep3 = aSteps[2];

            // ===============================
            // 1️⃣ HARD RESET WIZARD PROGRESS
            // ===============================
            oWizard.discardProgress(oStep1);

            // ===============================
            // 2️⃣ RESET VALIDATION STATES
            // ===============================
            oStep1.setValidated(false);
            oStep2.setValidated(false);
            oStep3.setValidated(false);

            // ===============================
            // 3️⃣ INVALIDATE DOWNSTREAM STEPS
            // ===============================
            oWizard.invalidateStep(oStep2);
            oWizard.invalidateStep(oStep3);

            // ===============================
            // 4️⃣ FORCE USER TO STEP 1
            // ===============================
            oWizard.goToStep(oStep1, true);
            this._iSelectedStepIndex = 0;
            this._oSelectedStep = oStep1;

            // ===============================
            // 5️⃣ FOOTER BUTTON STATE
            // ===============================
            oBTN.setProperty("/Next", false);
            oBTN.setProperty("/Submit", false);
            oBTN.setProperty("/Cancel", false);
            oBTN.setProperty("/PERVIOUSVIS", false);
            oBTN.setProperty("/NXTVis", true);

            // ===============================
            // 6 MODEL STATE
            // ===============================
            oHostelModel.setProperty("/IsGeneralInfoValid", false);
        },

        TC_onDialogNextButton: function () {

            const oView = this.getView();
            const oModel = oView.getModel("HostelModel");
            oModel.setProperty("/CouponCode", "");
            const oBtn = this.byId("couponApplyBtn");
            if (oBtn) {
                oBtn.setVisible(true);
            }

            const aPersons = oModel.getProperty("/Persons") || [];

            const sStartDate = oModel.getProperty("/StartDate");
            const sEndDate = oModel.getProperty("/EndDate");

            const baseRoomRent = Number(oModel.getProperty("/FinalPrice")) || 0;

            // 🔁 CENTRALIZED CALCULATION
            const selectedMonths =
                Number(oModel.getProperty("/SelectedMonths")) || 1;

            const result = this.calculateTotals(
                aPersons,
                sStartDate,
                sEndDate,
                baseRoomRent,
                selectedMonths
            );


            if (!result) {
                return;
            }

            oModel.setProperty("/Persons", [...result.Persons]);
            oModel.setProperty("/GrandTotal", result.GrandTotal);

            oModel.refresh(true);
        }
        ,


        calculateTotals: function (aPersons, sStartDate, sEndDate, roomRentPrice, selectedMonths) {

            selectedMonths = Number(selectedMonths) || 1;
            const oHostelModel = this.getView().getModel("HostelModel");
            const sGSTType = oHostelModel.getProperty("/GSTType");
            const sGSTValue = oHostelModel.getProperty("/GSTValue");

            let bAnyIndia = false;
            const oStartDate = this._parseDate(sStartDate);
            const oEndDate = this._parseDate(sEndDate);

            if (!oStartDate || !oEndDate) return null;

            // ---------- DAYS ----------
            let iDays =
                Math.floor((oEndDate - oStartDate) / (1000 * 3600 * 24)) + 1;
            const diffHours = 1;

            if (iDays <= 0 && diffHours <= 0) {
                MessageToast.show(this.i18nModel.getText("endDatemustbeafterStartDate"));
                return null;
            }

            // ---------- YEARS ----------
            let iYears = oEndDate.getFullYear() - oStartDate.getFullYear();
            iYears = iYears > 0 ? iYears : 1;

            let grandTotal = 0;

            aPersons.forEach(oPerson => {

                // ------------------
                // ROOM RENT
                // ------------------
                const paymentType =
                    this.getView().getModel("HostelModel")
                        .getProperty("/SelectedPriceType");
                let roomRent = 0;

                switch (paymentType) {
                    case "Per Day":
                        roomRent = Number(roomRentPrice) * iDays;
                        break;

                    case "Per Month":
                        roomRent = Number(roomRentPrice) * selectedMonths;
                        break;

                    case "Per Year":
                        roomRent = Number(roomRentPrice) * selectedMonths;
                        break;

                    default:
                        roomRent = Number(roomRentPrice);
                }

                oPerson.RoomRentPerPerson = roomRent;

                // ------------------
                // FACILITIES
                // ------------------
                let facilityTotal = 0;
                oPerson.AllSelectedFacilities = [];

                (oPerson.Facilities?.SelectedFacilities || []).forEach(f => {

                    let total = 0;
                    const price = Number(f.SelectedPrice) || 0;

                    switch (f.SelectedPriceType) {
                        case "Per Hour":
                            total = price * 1 * iDays;
                            break;
                        case "Per Day":
                            total = price * iDays;
                            break;
                        case "Per Month":
                            total = price * selectedMonths;
                            break;
                        case "Per Year":
                            total = price * iYears;
                            break;
                    }

                    facilityTotal += total;

                    oPerson.AllSelectedFacilities.push({
                        FacilityName: f.FacilityName,
                        Price: price,
                        Currency: f.Currency,
                        UnitText: f.SelectedPriceType,
                        StartDate: sStartDate,
                        EndDate: sEndDate,
                        TotalDays: iDays,
                        TotalAmount: total,
                        Image: f.Image,
                        Branch: f.BranchCode
                    });
                });

                oPerson.TotalFacilityPrice = facilityTotal;

                // ------------------
                // SUBTOTAL
                // ------------------
                oPerson.SubTotal =
                    oPerson.RoomRentPerPerson +
                    oPerson.TotalFacilityPrice;

                // ------------------
                // GST (DYNAMIC)
                // ------------------
                let cgst = 0;
                let sgst = 0;
                let igst = 0;

                if (sGSTType && sGSTType === "CGST/SGST") {

                    const gstPercent = Number(sGSTValue) || 0;   // eg: 18

                    // split equally
                    cgst = oPerson.SubTotal * (gstPercent) / 100;
                    sgst = oPerson.SubTotal * (gstPercent) / 100;

                    bAnyIndia = true;

                } else if (sGSTType && sGSTType === "IGST") {

                    const gstPercent = Number(sGSTValue) || 0;

                    igst = oPerson.SubTotal * gstPercent / 100;

                    bAnyIndia = true;
                }

                oPerson.CGST = Number(cgst.toFixed(2));
                oPerson.SGST = Number(sgst.toFixed(2));
                oPerson.IGST = Number(igst.toFixed(2));

                oPerson.FinalTotalCost =
                    Number((
                        oPerson.SubTotal + oPerson.CGST + oPerson.SGST + oPerson.IGST).toFixed(2));


               if (paymentType === "Per Day") {

    // Per Day → full amount (already includes total days)
    oPerson.MonthlyCostPerPerson =
        Number(oPerson.FinalTotalCost.toFixed(2));

    oPerson.MonthlyCostPerson =
        Number(oPerson.FinalTotalCost.toFixed(2));

} else {

    // Per Month / Per Year → divide by booking months
    const divisor = selectedMonths > 0 ? selectedMonths : 1;

    oPerson.MonthlyCostPerPerson =
        Number((oPerson.FinalTotalCost / divisor).toFixed(2));

    oPerson.MonthlyCostPerson =
        Number((oPerson.FinalTotalCost / divisor).toFixed(2));
}

                oPerson.MonthlyCostPerson =
                    oPerson.FinalTotalCost / selectedMonths;

                grandTotal += Number(oPerson.FinalTotalCost) || 0;

            });
            grandTotal = Number(grandTotal.toFixed(2));

            aPersons.forEach(p => {
                p.GrandTotal = grandTotal;
            });


            return {
                Persons: aPersons.map(p => ({ ...p })),   // NEW ARRAY
                GrandTotal: grandTotal
            };
        },

        // Helper function to parse date
        _parseDate: function (sDate) {

            // If null or empty → return null safely
            if (!sDate) return null;

            // If already a Date object → return normalized copy
            if (sDate instanceof Date) {
                return new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate());
            }

            // If not a string → return null
            if (typeof sDate !== "string") return null;

            // Existing logic
            if (sDate.includes("/")) {
                const parts = sDate.split("/");
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }

            // ISO fallback
            const d = new Date(sDate);
            if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), d.getDate());

            return null;
        },


        onFieldValidation: function (oEvent) {
            utils._LCvalidateDate(oEvent);
            const oView = this.getView();
            const oHostelModel = oView.getModel("HostelModel");
            const oBtnModel = oView.getModel("OBTNModel");

            const oData = oHostelModel.getData();
            const oStartDatePicker = oView.byId("idStartDate1");
            const oEndDatePicker = oView.byId("idEndDate1");

            const sStartDate = oStartDatePicker?.getValue() || "";
    // =========================================================
// HARD ENFORCEMENT: StartDate >= TodayDate
// =========================================================
const oTodayDate = oHostelModel.getProperty("/TodayDate");

if (
    oEvent.getSource().getId().includes("idStartDate1") &&
    sStartDate &&
    oTodayDate instanceof Date
) {
    const oSelectedStart = this._parseDate(sStartDate);

    if (oSelectedStart instanceof Date) {

        oSelectedStart.setHours(0, 0, 0, 0);
        oTodayDate.setHours(0, 0, 0, 0);

        if (oSelectedStart < oTodayDate) {

            // force reset
            const d = String(oTodayDate.getDate()).padStart(2, "0");
            const m = String(oTodayDate.getMonth() + 1).padStart(2, "0");
            const y = oTodayDate.getFullYear();

            const sCorrectedDate = `${d}/${m}/${y}`;

            oHostelModel.setProperty("/StartDate", sCorrectedDate);
            oStartDatePicker.setValue(sCorrectedDate);

            oStartDatePicker.setValueState("Error");
            oStartDatePicker.setValueStateText(
                this.i18nModel.getText("enterStartDate")
            );

            oBtnModel.setProperty("/Next", false);
            return; // ⛔ STOP ALL FURTHER LOGIC
        }
    }
}

            const sEndDate = oEndDatePicker?.getValue() || "";
            const sPaymentType = oData.SelectedPriceType || oView.byId("idPaymentMethod1")?.getValue() || "";
            const sPerson = oData.Person || oView.byId("id_Noofperson1")?.getSelectedKey() || "";

            const iSelectedMonths = parseInt(oHostelModel.getProperty("/SelectedMonths") || 1, 10);

            let bAllFilled = sPaymentType && sPerson && sStartDate && sEndDate;

            // =========================================================
            // RESET Per Day info popup when Start/End Date changes
            // =========================================================
            if (
                oEvent.getSource().getId().includes("idStartDate1") ||
                oEvent.getSource().getId().includes("idEndDate1")
            ) {
                this._perDayInfoShown = false;
            }

            // =========================================================
            // Set MIN End Date based on Start Date
            // =========================================================
            if (sStartDate) {
                const oStart = this._parseDate(sStartDate);

                if (oStart instanceof Date && !isNaN(oStart)) {

                    // For Per Day → same day allowed
                    if (sPaymentType === "Per Day") {
                        oEndDatePicker.setMinDate(oStart);
                    }
                    // For Per Month / Year → next day minimum
                    else {
                        const oMinEnd = new Date(oStart);
                        oMinEnd.setDate(oMinEnd.getDate() + 1);
                        oEndDatePicker.setMinDate(oMinEnd);
                    }
                }
            }

            // MONTHLY PLAN — TRUE CALENDAR MONTH ADDITION
            if (
                oEvent.getSource().getId().includes("idStartDate1") &&
                sStartDate &&
                sPaymentType === "Per Month"
            ) {

                const oStart = this._parseDate(sStartDate);

                if (oStart instanceof Date && !isNaN(oStart)) {
                    let oNewEnd = new Date(oStart);
                    oNewEnd.setMonth(oNewEnd.getMonth() + iSelectedMonths);
                    oNewEnd.setDate(oNewEnd.getDate() - 1);

                    const sNewEndDate = this._formatDateToDDMMYYYY(oNewEnd);

                    oHostelModel.setProperty("/EndDate", sNewEndDate);
                    oEndDatePicker.setValue(sNewEndDate);

                    oBtnModel.setProperty("/Next", true);
                    return;
                }
            }

            if (
                oEvent.getSource().getId().includes("idStartDate1") &&
                sStartDate &&
                sPaymentType === "Per Year"
            ) {

                const oStart = this._parseDate(sStartDate);

                if (oStart instanceof Date && !isNaN(oStart)) {
                    let oNewEnd = new Date(oStart);
                    oNewEnd.setFullYear(oNewEnd.getFullYear() + iSelectedMonths);
                    oNewEnd.setDate(oNewEnd.getDate() - 1);

                    const sNewEndDate = this._formatDateToDDMMYYYY(oNewEnd);

                    oHostelModel.setProperty("/EndDate", sNewEndDate);
                    oEndDatePicker.setValue(sNewEndDate);

                    oBtnModel.setProperty("/Next", true);
                    return;
                }
            }

            // =========================================================
            // PER DAY inclusive calculation
            // =========================================================
            if (sPaymentType === "Per Day" && sStartDate && sEndDate) {
                const oStart = this._parseDate(sStartDate);
                const oEnd = this._parseDate(sEndDate);

                // inclusive day count
                let diffDays = Math.floor((oEnd - oStart) / (1000 * 60 * 60 * 24)) + 1;

                if (diffDays <= 0) {
                    oEndDatePicker.setValueState("Error");
                    oEndDatePicker.setValueStateText(this.i18nModel.getText("endDateCannotbeforeStartDate"));
                    MessageToast.show(this.i18nModel.getText("endDateCannotbeforeStartDate"));
                    oHostelModel.setProperty("/EndDate", "");
                    oBtnModel.setProperty("/Next", false);
                    return;
                }

                oHostelModel.setProperty("/TotalDays", diffDays);
                oEndDatePicker.setValueState("None");


            }

            if (oEvent.getSource().getId().includes("idStartDate1") ||
                oEvent.getSource().getId().includes("idEndDate1") ||
                oEvent.getSource().getId().includes("id_Noofperson1")
            ) {
                this._resetWizardFromStep1();
                this._bPricingDirty = true;
            }

            // =========================================================
            // CONTROL “Next” BUTTON
            // =========================================================
            const bEndDateValid = !!(sEndDate && sEndDate.trim() !== "");
            oBtnModel.setProperty("/Next", !!(bAllFilled && bEndDateValid));
        },

        SM_onGeneratePassword: function () {
            var oPwdInput = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpPassword");
            var oStrength = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "passwordStrengthText"); // signup label

            if (!oPwdInput) {
                console.error("❌ signUpPassword input not found");
                return;
            }

            var pwd = utils._LCgenerateStrongPassword();
            oPwdInput.setValue(pwd);

            // Run same validation logic + update strength label
            utils._LCvalidatePassword(oPwdInput, oStrength);
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

        onMonthSelectionChange: function (oEvent) {
            this._bPricingDirty = true;
            const oView = this.getView();
            const oHostelModel = oView.getModel("HostelModel");

            // Selected duration: Per Month / Per Year / Per Day
            const sDuration =
                oHostelModel.getProperty("/SelectedPriceType");

            // Selected number (1–11)
            const iSelectedMonths =
                parseInt(oEvent.getSource().getSelectedKey() || "1", 10);

            oHostelModel.setProperty(
                "/SelectedMonths",
                iSelectedMonths
            );

            const sStartDate =
                oView.byId("idStartDate1")?.getValue() || "";

            if (!sStartDate) {
                MessageToast.show(
                    this.i18nModel.getText("pleaseSelectStartDateFirst")
                );
                return;
            }

            // Convert dd/MM/yyyy → Date object
            const oStart = this._parseDate(sStartDate);

            if (!(oStart instanceof Date) || isNaN(oStart)) {
                MessageToast.show(
                    this.i18nModel.getText("invalidStartDate")
                );
                return;
            }

            let oEnd = new Date(oStart);

            //  REAL DATE LOGIC
            if (sDuration === "Per Month") {

                oEnd.setMonth(oEnd.getMonth() + iSelectedMonths);
                oEnd.setDate(oEnd.getDate() - 1);

            } else if (sDuration === "Per Year") {

                oEnd.setFullYear(oEnd.getFullYear() + iSelectedMonths);
                oEnd.setDate(oEnd.getDate() - 1);

            } else if (sDuration === "Per Day") {

                MessageToast.show(
                    this.i18nModel.getText("durationperdayNoSelectionNeeded")
                );
                return;
            }

            // Convert to dd/MM/yyyy
            const sEndDate =
                this._formatDateToDDMMYYYY(oEnd);

            // Update model and UI
            oHostelModel.setProperty("/EndDate", sEndDate);
            oView.byId("idEndDate1")?.setValue(sEndDate);

            //  RE-CALCULATE TOTALS IMMEDIATELY
            const aPersons =
                oHostelModel.getProperty("/Persons") || [];

            const result = this.calculateTotals(
                aPersons,
                sStartDate,
                sEndDate,
                Number(oHostelModel.getProperty("/FinalPrice")) || 0,
                iSelectedMonths
            );
            this.byId("step1").setValidated(false);
            oHostelModel.setProperty("/IsGeneralInfoValid", false);

            if (result) {
                oHostelModel.setProperty("/Persons", [...result.Persons]);

                oHostelModel.setProperty("/GrandTotal", result.GrandTotal);
                oHostelModel.refresh(true);
            }
        }
        ,

        _formatDateToDDMMYYYY: function (oDate) {
            if (!(oDate instanceof Date)) return "";
            const dd = String(oDate.getDate()).padStart(2, "0");
            const mm = String(oDate.getMonth() + 1).padStart(2, "0");
            const yyyy = oDate.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
        },

        onNavBack: function () {
            const oUser = this._oLoggedInUser;
            const oUIModel = this.getOwnerComponent().getModel("UIModel");

            if (oUser && oUser.UserID) {
                oUIModel.setProperty("/isLoggedIn", true);
            } else {
                oUIModel.setProperty("/isLoggedIn", false);
            }

            const oBookingID = this.getView().getModel("HostelModel").getProperty("/BranchCode");
            // const aDate = this.getView().getModel("HostelModel").getProperty("/AvailableDate");


            this.getOwnerComponent().getRouter().navTo("RouteViewRooms", {
                sPath: oBookingID
            }
            )
            //  this.getView().setModel(new JSONModel({
            //     Date: aDate
            // }), "ViewDateModel");


        },

        onRoomDurationChange: function (oEvent) {
            this._bPricingDirty = true;
            this._resetWizardFromStep1();
            const oView = this.getView();
            const oHostelModel = oView.getModel("HostelModel");

            /* =========================================
               RESET FACILITIES WHEN ROOM PLAN CHANGES
               ========================================= */

            const aPersons = oHostelModel.getProperty("/Persons") || [];

            aPersons.forEach(p => {
                // Clear both structures
                p.AllSelectedFacilities = [];
                if (p.Facilities) {
                    p.Facilities.SelectedFacilities = [];
                }

                // Reset totals
                p.TotalFacilityPrice = 0;
                p.RoomRentPerPerson = 0;
                p.SubTotal = 0;
                p.CGST = 0;
                p.SGST = 0;
                p.FinalTotalCost = 0;
            });

            // Clear grand total
            oHostelModel.setProperty("/GrandTotal", 0);
            oHostelModel.setProperty("/Persons", aPersons);

            /* =========================================
               CLEAR CARD HIGHLIGHTS
            ========================================= */
            setTimeout(() => {
                $(".serviceCard").each(function () {
                    const ctrl = sap.ui.getCore().byId($(this).attr("id"));
                    if (ctrl) {
                        ctrl.removeStyleClass("serviceCardSelected");
                    }
                });
            }, 50);

            const oRoomDetailModel = oView.getModel("RoomDetailModel");
            const oBTN = oView.getModel("OBTNModel");

            if (this._oWizard) {
                const aSteps = this._oWizard.getSteps();
                this._oWizard.goToStep(aSteps[0], true); // force General Info
                this._oSelectedStep = aSteps[0];
                this._iSelectedStepIndex = 0;
            }

            //  LOCK PERSONAL INFO STEP
            oHostelModel.setProperty("/IsGeneralInfoValid", false);
            oBTN.setProperty("/Next", false);
            oBTN.setProperty("/Submit", false);
            oBTN.setProperty("/Cancel", false);

            //  FORCE INTERNAL WIZARD STATE
            this._iSelectedStepIndex = 0;
            this._oSelectedStep = this._oWizard.getSteps()[0];

            if (!oHostelModel || !oRoomDetailModel || !oBTN) return;

            //  Now we read value instead of key
            const sValue = oEvent.getSource().getValue();

            const iMonths = parseInt(oHostelModel.getProperty("/SelectedMonths") || "1", 10);
            const sStartDate = oHostelModel.getProperty("/StartDate");
            const sEndDate = oHostelModel.getProperty("/EndDate");

            if (!sValue && (!sStartDate || !sEndDate)) {

                const aSteps = this._oWizard.getSteps();
                const oCurrentStep = aSteps[this._iSelectedStepIndex] || aSteps[0];

                if (oCurrentStep && typeof oCurrentStep.setValidated === "function") {
                    oCurrentStep.setValidated(false);
                }

                // ✅ GET DATE PICKERS CORRECTLY
                const sViewId = this.getView().getId();
                const oStartDP = sap.ui.getCore().byId(sViewId + "--idStartDate1");
                const oEndDP = sap.ui.getCore().byId(sViewId + "--idEndDate1");

                if (!sStartDate && oStartDP) {
                    oStartDP.setValueState(sap.ui.core.ValueState.Error);
                    oStartDP.setValueStateText(this.i18nModel.getText("pleaseselectStartDate"));
                }

                if (!sEndDate && oEndDP) {
                    oEndDP.setValueState(sap.ui.core.ValueState.Error);
                    oEndDP.setValueStateText(this.i18nModel.getText("pleaseselectEndDate"));
                }

                oBTN.setProperty("/Next", false);
                oBTN.setProperty("/Submit", false);
                oHostelModel.setProperty("/IsGeneralInfoValid", false);

                return;
            }
            // Update selected type
            oHostelModel.setProperty("/SelectedPriceType", sValue);
            this._applyFacilityPriceFilter();
            const oEndDatePicker = oView.byId("idEndDate1");
            const sBranchCode = oHostelModel.getProperty("/BranchCode") || "";

            /** ⭐ Price Calculation */
            const sRoomType = oView.byId("GI_Roomtype")?.getText()?.trim() || "";
            const aRoomDetails = oRoomDetailModel.getData();

            const normalize = v => (v ? String(v).trim().toLowerCase() : "");
            const oMatchingRoom = aRoomDetails.find(item =>
                normalize(item.BedTypeName) === normalize(sRoomType) &&
                normalize(item.BranchCode) === normalize(sBranchCode)
            );

            if (!oMatchingRoom) {
                oHostelModel.setProperty("/FinalPrice", "");
                return;
            }

            // ⭐ Set price by VALUE
            if (sValue === "Per Day") {
                oHostelModel.setProperty("/FinalPrice", oMatchingRoom.Price);
            }
            else if (sValue === "Per Month") {
                oHostelModel.setProperty("/FinalPrice", oMatchingRoom.MonthPrice);
            }
            else if (sValue === "Per Year") {
                oHostelModel.setProperty("/FinalPrice", oMatchingRoom.YearPrice);
            }

            /** ⭐ Per Day → user selects date manually */
            if (sValue === "Per Day") {
                this._oWizard.invalidateStep();
                oBTN.setProperty("/Month", false);
                oHostelModel.setProperty("/StartDate", "");
                oHostelModel.setProperty("/EndDate", "");
                oEndDatePicker.setEditable(true);
                oBTN.setProperty("/Next", false);
                return;
            }

            /** ⭐ Per Month / Per Year → automatic end date */
            if (sValue === "Per Month" || sValue === "Per Year") {
                this._oWizard.invalidateStep();
                oBTN.setProperty("/Month", true);

                oHostelModel.setProperty("/SelectedMonths", "1");
                oHostelModel.setProperty("/StartDate", "");
                oHostelModel.setProperty("/EndDate", "");

                oEndDatePicker.setEditable(false);
                oBTN.setProperty("/Next", false);
                return;
            }

            /** ⭐ Need Start Date to calculate */
            if (!sStartDate) {
                oHostelModel.setProperty("/EndDate", "");
                oEndDatePicker.setValue("");
                return;
            }

            const oStart = this._parseDate(sStartDate);
            if (!(oStart instanceof Date) || isNaN(oStart)) return;

            let iDaysAdd = 0;

            // ⭐ Now based on VALUE
            if (sValue === "Per Month") {
                iDaysAdd = iMonths * 30;
            }
            else if (sValue === "Per Year") {
                iDaysAdd = iMonths * 365;
            }

            const oEnd = new Date(oStart);
            oEnd.setDate(oEnd.getDate() + iDaysAdd);

            const sEnd = this._formatDateToDDMMYYYY(oEnd);

            oHostelModel.setProperty("/EndDate", sEnd);
            oEndDatePicker.setValue(sEnd);

            oBTN.refresh(true);
            oHostelModel.refresh(true);
            this._validateGeneralInfo()

        },

        //login
        _validateFPFields: function () {
            let id = sap.ui.getCore().byId("fpUserId").getValue();
            let name = sap.ui.getCore().byId("fpUserName").getValue();
            let btn = this._oForgotDialog.getBeginButton();

            btn.setEnabled(id !== "" && name !== "");
        },

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

        onFPValidate: function () {
            const id = sap.ui.getCore().byId("fpUserId").getValue().trim();
            const name = sap.ui.getCore().byId("fpUserName").getValue().trim();
            sap.ui.getCore().byId("btnFPNext").setEnabled(id !== "" && name !== "");
        },

        onOtpLive: function (e) {
            const sInput = oEvent.getSource();
            const sVal = oEvent.getParameter("value").replace(/\D/g, ""); // allow digits only

            sInput.setValue(sVal);

            // Keep it in error state until full 6 digits
            if (sVal.length === 6) {
                sInput.setValueState(sap.ui.core.ValueState.None);
            } else {
                sInput.setValueState(sap.ui.core.ValueState.Error);
                sInput.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
            }
        },

        // Sign In
        onSigninPasswordLive: function (oEvent) {
            utils._LCvalidatePassword(oEvent);
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


                this.getOwnerComponent()
                    .getModel("UserModel")
                    ?.setData(oMatchedUser);

                // Clear input fields
                if (ctrlEmailId) ctrlEmailId.setValue("");
                if (ctrlPassword) ctrlPassword.setValue("");

                // Close dialog
                if (oFragment) oFragment.close();

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

        _setLoggedInUser: function (user) {
            const oLoginModel = this.getView().getModel("LoginModel");

            oLoginModel.setProperty("/EmployeeID", user.UserID);
            oLoginModel.setProperty("/EmployeeName", user.UserName);
            oLoginModel.setProperty("/EmailID", user.EmailID);
            oLoginModel.setProperty("/Role", user.Role);
            oLoginModel.setProperty("/BranchCode", user.BranchCode || "");
            oLoginModel.setProperty("/MobileNo", user.MobileNo || "");
            oLoginModel.setProperty("/DateofBirth", user.DateofBirth || "");

            this._oLoggedInUser = user;

            if (user.Role === "Customer") {
            } else {
                this.getOwnerComponent().getRouter().navTo("TilePage");
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

        _resetAllAuthFields: function () {
            ["signInuserid", "signInusername", "signinPassword",
                "fpEmailId", "fpOTP", "newPass", "confPass", "loginOTP"
            ]
                .forEach(id => {
                    let o = sap.ui.getCore().byId(id);
                    if (o) o.setValue("");
                });
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
                    Address: data.Address.trim()
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

        _resetAuthDialog: function () {
            const oModel = this.getView().getModel("LoginMode");
            // Reset LoginMode data (your existing block)
            oModel.setData({
                Salutation: "",
                fullname: "",
                Email: "",
                STDCode: "",
                Mobileno: "",
                password: "",
                comfirmpass: "",
                UserID: "",
                Gender: "",
                Country: "",
                State: "",
                City: "",
                Address: "",
                DateOfBirth: ""
            });
            //  Reset UI controls
            //  Reset Sign-Up controls
            [
                "signUpSalutation", "signUpName", "signUpEmail", "signUpPassword",
                "signUpConfirmPassword", "signUpDOB", "signUpGender", "signUpCountry",
                "signUpState", "signUpCity", "signUpSTD", "signUpPhone", "signUpAddress"
            ].forEach(id => {
                const ctrl = $C(id);
                if (ctrl) {
                    ctrl.setValueState("None");
                    if (ctrl.setValue) ctrl.setValue("");
                    if (ctrl.setSelectedKey) ctrl.setSelectedKey("");
                }
            });

            //  Reset Sign-In controls
            ["signInuserid", "signInusername", "signinPassword"].forEach(id => {
                const ctrl = $C(id);
                if (ctrl) {
                    ctrl.setValueState("None");
                    if (ctrl.setValue) ctrl.setValue("");
                }
            });
            // Re-enable STD & Gender
            const STD = $C("signUpSTD");
            const GEN = $C("signUpGender");
            if (STD) STD.setEnabled(true);
            if (GEN) GEN.setEnabled(true);

            // Reset account type
            const oVM = this.getView().getModel("LoginViewModel");
            oVM.setProperty("/selectedAccountType", "personal");
            oVM.setProperty("/authFlow", "signin");
            this._resetOtpState();

            // Clear all fields including forgot/otp/reset
            this._clearAllAuthFields();

            // Remove blur effect from the background
            this.getView().removeStyleClass("blur-background");

            // Ensure only Sign In panel is visible when dialog opens next time

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
            // Dr. → user must choose gender manually
            // ✅ STRICT validation -- pass CONTROL, not event
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
                const oMaxDate = new Date(oToday.getFullYear() - 10, oToday.getMonth(), oToday.getDate());
                oDOBpicker.setMaxDate(oMaxDate);

                // Min date: 100 years ago from today
                const oMinDate = new Date(oToday.getFullYear() - 100, oToday.getMonth(), oToday.getDate());
                oDOBpicker.setMinDate(oMinDate);
            }
            this._resetOtpState();
            this._addPasswordGenerateIcon();
        },

        onEmailliveChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },

        SM_onTogglePasswordVisibility: function (oEvent) {
            const oInput = oEvent.getSource();
            const isPassword = oInput.getType() === "Password";

            oInput.setType(isPassword ? "Text" : "Password");
            oInput.setValueHelpIconSrc(isPassword ? "sap-icon://hide" : "sap-icon://show");
        },
       
        // Robust helper to find control inside your Login fragment
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
        },

        onOpenProceedtoPay: function () {

            if (this._oPaymentDialog) {
                this._oPaymentDialog.destroy();
                this._oPaymentDialog = null;
            }

            if (!this._oPaymentDialog) {
                this._oPaymentDialog = sap.ui.xmlfragment(
                    "sap.ui.com.project1.fragment.PaymentPage",
                    this
                );
                this.getView().addDependent(this._oPaymentDialog);
            }

            const oPaymentModel = this.getView().getModel("PaymentModel");
            const oHostelModel = this.getView().getModel("HostelModel");

            // Default values
            oPaymentModel.setProperty(
                "/PaymentDate",
                this.Formatter.formatDate(new Date())
            );
            oPaymentModel.setProperty("/PaymentType", "PayOnCheckIn");

            // Default radio = PayOnCheckIn
            const oRadio = sap.ui.getCore().byId("idPaymentTypeGroup");
            if (oRadio) {
                oRadio.setSelectedIndex(0);
            }

            this.onPaymentTypeSelect({
                getSource: () => ({
                    getSelectedIndex: () => 0
                })
            });

            this._oPaymentDialog.open();
        }
        ,

        onPaymentTypeSelect: function (oEvent) {

            const index = oEvent.getSource().getSelectedIndex();

            const isPayOnCheckIn = index === 0;
            const isUPI = index === 1;
            const isCard = index === 2;

            this._togglePaymentSections(isUPI, isCard, isPayOnCheckIn);

            const oPaymentModel = this.getView().getModel("PaymentModel");
            const oHostelModel = this.getView().getModel("HostelModel");

            const paymentType =
                oHostelModel.getProperty("/SelectedPriceType");

            const aPersons =
                oHostelModel.getProperty("/Persons") || [];

            let totalPersonsMonthly = 0;

            if (paymentType === "Per Day") {

                totalPersonsMonthly = aPersons.reduce(
                    (s, p) => s + (Number(p.FinalTotalCost) || 0),
                    0
                );

            } else {

                totalPersonsMonthly = aPersons.reduce(
                    (s, p) => s + (Number(p.MonthlyCostPerPerson) || 0),
                    0
                );
            }

            // store again every time
            oHostelModel.setProperty(
                "/PerMonthNoPerson",
                Number(totalPersonsMonthly.toFixed(2))
            );


            // -----------------------------
            // PAY ON CHECKIN
            // -----------------------------
            if (isPayOnCheckIn) {

                oPaymentModel.setProperty("/PaymentType", "PayOnCheckIn");
                oPaymentModel.setProperty("/Amount", "0");
                oPaymentModel.setProperty("/PaymentDate", "");

                oHostelModel.setProperty(
                    "/PayableAmountPerMonth",
                    totalPersonsMonthly
                );

                oHostelModel.setProperty(
                    "/PerMonthNoPerson",
                    totalPersonsMonthly
                );

                return;
            }

            /* =====================
               UPI / CARD
            ===================== */

            oPaymentModel.setProperty(
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

            oHostelModel.setProperty(
                "/PerMonthNoPerson",
                totalPersonsMonthly
            );
        },

        _togglePaymentSections: function (isUPI, isCard, isPayOnCheckIn) {
            // LEFT SIDE visibility
            sap.ui.getCore().byId("idUPISection")?.setVisible(isUPI);
            sap.ui.getCore().byId("idCardSection")?.setVisible(isCard);

            // RIGHT SIDE (Payment Verification section)
            const oRightPanel = sap.ui.getCore().byId("idRightPanel");

            if (isPayOnCheckIn) {
                // Hide everything for Pay on Check-In
                sap.ui.getCore().byId("idUPISection")?.setVisible(false);
                sap.ui.getCore().byId("idCardSection")?.setVisible(false);
                oRightPanel?.setVisible(false);
            } else {
                // For UPI or Card → show verification panel
                oRightPanel?.setVisible(true);
            }

            // Clear all fields when switching types
            const aFields = [
                "idAmount", "idPaymentTypeField", "idTransactionID",
                "idPaymentDate", "idCardNumber", "idCardExpiry", "idCardCVV"
            ];

            aFields.forEach(function (sId) {
                const oControl = sap.ui.getCore().byId(sId);
                if (oControl) {
                    oControl.setValue("");
                    oControl.setValueState(sap.ui.core.ValueState.None);
                    oControl.setValueStateText("");
                }
            });

        },


        _clearAllPaymentFields: function () {
            [
                "idAmount", "idPaymentTypeField", "idTransactionID",
                "idPaymentDate", "idCardNumber",
                "idCardExpiry", "idCardCVV"
            ].forEach(id => {
                const c = sap.ui.getCore().byId(id);
                if (!c) return;
                if (c.setValue) c.setValue("");
                if (c.setSelectedKey) c.setSelectedKey("");
                c.setValueState("None");
            });
        },

        onPaymentClose: function () {
            if (this._oPaymentDialog) {
                this._oPaymentDialog.close();
            }

            const aFields = [
                "idAmount", "idPaymentTypeField", "idTransactionID",
                "idPaymentDate", "idCardNumber", "idCardExpiry", "idCardCVV"
            ];
            aFields.forEach(id => {
                const oField = sap.ui.getCore().byId(id);
                if (oField) {
                    oField.setValue("");
                    oField.setValueState("None");
                    oField.setValueStateText("");
                }
            });
        },

        // onBankNameChange: function (oEvent) {
        //     const oInput = oEvent.getSource();
        //     utils._LCvalidateMandatoryField(oEvent);
        //     if (oInput.getValue() === "") oInput.setValueState("None");
        // },

        // onCurrencyChange: function (oEvent) {
        //     const oInput = oEvent.getSource();
        //     utils._LCstrictValidationComboBox(oEvent);
        //     if (oInput.getValue() === "") oInput.setValueState("None");
        // },

        onTransactionIDChange: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        // onChangeUPIID: function (oEvent) {
        //     const oInput = oEvent.getSource();
        //     utils._LCvalidateMandatoryField(oEvent);
        //     if (oInput.getValue() === "") oInput.setValueState("None");
        // },

        onPaymentDateChange: function (oEvent) {
            const oInput = oEvent.getSource();
            if (!oInput.getValue()) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("selectPaymentDate"));
            } else {
                oInput.setValueState("None");
            }
        },

        onSubmitPress: async function () {
            const oModel = this.getView().getModel("HostelModel");
            const oData = oModel.getData();
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

            try {
                // Format payload according to your new structure
                const formattedPayload = oData.Persons.map((p, index) => {
                    const bookingData = [];
                    const facilityData = [];

                    //  FIX: Use oData for booking fields, not individual person object
                    if (oData.StartDate) {
                        var rentPrice = Number(p.FinalTotalCost || 0);
                        var Discountvalue = Number(p.AppliedDiscount || 0);
                        var oCouponCode = oData.CouponCode || "";
                        var today = new Date();
                        var todayDate = today.toISOString().split("T")[0];
                        var iSelected = Number(oData.SelectedPerson || 0);
                        var iPersons = oData.Persons.length || 1;
                        var iSplitValue = Math.ceil(iSelected / iPersons);
                        bookingData.push({
                            BookingDate: todayDate,
                            RentPrice: rentPrice.toString(),
                            RoomPrice: oData.FinalPrice,
                            NoOfPersons: iSplitValue,
                            StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                            EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                            Status: "New",
                            PaymentType: oData.SelectedPriceType || "",
                            BedType: `${oData.BedType} - ${oData.ACType}`,
                            BranchCode: oData.BranchCode,
                            Currency: oData.Currency,
                            Discount: Discountvalue.toString() || "0",
                            CouponCode: index === 0 ? oCouponCode : "",
                            TotalRoomprice: p.RoomRentPerPerson.toString() || "0",
                            UserID: p.UserID,
                            GSTType: oData.GSTType || "",
                            GSTValue: oData.GSTValue ? oData.GSTValue.toString() : "0",
                            GSTIN: oData.GSTIN || ""
                        });
                    }
                    let paymentDetails;

                    if (isPayOnCheckIn) {
                        const today = new Date();
                        const todayDate = today.toISOString().split("T")[0];

                        // ✔ Pay on checkin → Amount must be 0
                        paymentDetails = {
                            Amount: "0",
                            PaymentType: "PayOnCheckIn",
                            BankTransactionID: "",
                            Date: todayDate
                        };

                    } else {

                        // ✔ Normal payment → take user input
                        paymentDetails = {
                            Amount: p.MonthlyCostPerPerson,
                            PaymentType: sap.ui.getCore().byId("idPaymentTypeField").getValue(),
                            BankTransactionID: sap.ui.getCore().byId("idTransactionID").getValue(),
                            Date: sap.ui.getCore().byId("idPaymentDate").getValue()
                                ? sap.ui.getCore().byId("idPaymentDate").getValue().split("/").reverse().join("-")
                                : "",

                            BranchCode: oData.BranchCode || "",
                            CustomerName: p.FullName || "",
                            Currency: oData.Currency || "INR",
                            BranchName: oData.Area || "",
                            BankName: sap.ui.getCore().byId("idPaymentTypeField").getValue()
                        };

                    }

                    // Store in model temporarily
                    oData.PaymentDetails = paymentDetails;

                    //  Handle both object and string facility formats
                    const aSelectedFacilities = p.AllSelectedFacilities || [];

                    aSelectedFacilities.forEach(fac => {

                        let facilityPrice = fac.TotalAmount || 0;
                        facilityData.push({
                            PaymentID: "",
                            FacilityName: fac.FacilityName,
                            FacilitiPrice: facilityPrice,
                            StartDate: fac.StartDate ? fac.StartDate.split("/").reverse().join("-") : "",
                            EndDate: fac.EndDate ? fac.EndDate.split("/").reverse().join("-") : "",
                            PaidStatus: "Pending",
                            UnitText: fac.UnitText,
                            Currency: fac.Currency,
                            BasicFacilityPrice: fac.Price
                        });
                    });

                    // Return formatted entry
                    return {
                        Salutation: p.Salutation,
                        CustomerName: p.FullName,
                        UserID: p.UserID,
                        STDCode: p.STDCode,
                        MobileNo: p.MobileNo,
                        Gender: p.Gender,
                        DateOfBirth: p.DateOfBirth ? p.DateOfBirth.split("/").reverse().join("-") : "",
                        CustomerEmail: p.CustomerEmail,
                        Country: p.Country,
                        State: p.State,
                        City: p.City,
                        PermanentAddress: p.Address,
                        Documents: (p.Documents && p.Documents.length > 0)
                            ? p.Documents.map(doc => ({
                                DocumentType: p.DocumentType || "",
                                File: doc.Document,
                                FileName: doc.FileName,
                                FileType: doc.FileType
                            }))
                            : [],
                        Booking: bookingData,
                        FacilityItems: facilityData,
                        PaymentDetails: [oData.PaymentDetails]
                    };
                });

                // Final payload structure
                const oPayload = {
                    data: formattedPayload
                };

                BusyIndicator.show(0)
                // AJAX call
                const oResponse = await this.ajaxCreateWithJQuery("HM_Customer", oPayload);

                // Extract BookingDetails array
                const aBookingDetails = oResponse.BookingDetails || [];
                this._oPaymentDialog.close()
                BusyIndicator.hide()

                let sMessage = "Booking Successful!\n\n";

                aBookingDetails.forEach((item, index) => {
                    sMessage += "Booking ID: " + item.BookingID + "\n";
                });

                // Show success box
                MessageBox.success(sMessage, {
                    title: "Success",
                    actions: [MessageBox.Action.OK],
                    onClose: function () {
                        // Check login status
                        const oLoginModel = sap.ui.getCore().getModel("LoginModel");
                        const isLoggedIn = oLoginModel && oLoginModel.getProperty("/UserID");
                        oModel.setProperty("/CouponCode", "")
                        // Continue navigation after warning
                        if (isLoggedIn) {
                            this._navigateAfterBooking();
                        }
                        this.resetAllBookingData();

                        //  RESET DYNAMIC UI FLAGS
                        this._isPersonUIInitialized = false;
                        this._mustRecreatePersonUI = true;
                        this._lastPersonCount = null;
                        this._iSelectedStepIndex = 0;
                        this._oSelectedStep = null;
                        var oRoute = this.getOwnerComponent().getRouter();
                        oRoute.navTo("RouteHostel");
                    }.bind(this)
                });

            } catch (e) {
                BusyIndicator.hide();
                let errorMsg = "Unknown error";

                // jQuery AJAX always returns responseJSON inside e.responseJSON
                if (e && e.responseJSON) {
                    errorMsg = e.responseJSON.message || e.responseJSON.error || JSON.stringify(e.responseJSON);
                }
                // Sometimes backend returns raw responseText
                else if (e && e.responseText) {
                    try {
                        const parsed = JSON.parse(e.responseText);
                        errorMsg = parsed.message || parsed.error || e.responseText;
                    } catch (parseErr) {
                        errorMsg = e.responseText;
                    }
                }
                // Fallback — if nothing matched
                else if (e.message) {
                    errorMsg = e.message;
                }
                MessageBox.error(errorMsg);
            }
        },

        _navigateAfterBooking: function () {
            setTimeout(function () {

                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteManageProfile");
                this.resetAllBookingData();

                //  RESET DYNAMIC UI FLAGS
                this._isPersonUIInitialized = false;
                this._mustRecreatePersonUI = true;
                this._lastPersonCount = null;
                this._iSelectedStepIndex = 0;
                this._oSelectedStep = null;

            }.bind(this), 500);

            const oAvatar = this.byId("ProfileAvatar");
            if (oAvatar) {
                oAvatar.setVisible(true);
            }
        },

        _applyCountryStateCityFilters: function () {
            if (!this._oProfileDialog) return; // safety check

            const oModel = this._oProfileDialog.getModel("profileData");
            if (!oModel) return;

            const oCountryCB = this.byId("id_country");
            const oStateCB = this.byId("id_state");
            const oSourceCB = this.byId("id_city");

            const sCountry = oModel.getProperty("/Country") || "";
            const sState = oModel.getProperty("/State") || "";
            const sSource = oModel.getProperty("/City") || "";

            // Reset all filters
            oStateCB.getBinding("items")?.filter([]);
            oSourceCB.getBinding("items")?.filter([]);

            if (sCountry) {
                // Find countryCode by name
                const aCountryData = this.getView().getModel("CountryModel").getData();
                const oCountryObj = aCountryData.find(c => c.countryName === sCountry);

                if (oCountryObj) {
                    const sCountryCode = oCountryObj.code;

                    // Filter States by Country
                    oStateCB.getBinding("items")?.filter([
                        new Filter("countryCode", FilterOperator.EQ, sCountryCode)
                    ]);

                    if (sState) {
                        // Filter Cities by State + Country
                        const aFilters = [
                            new Filter("stateName", FilterOperator.EQ, sState),
                            new Filter("countryCode", FilterOperator.EQ, sCountryCode)
                        ];
                        oSourceCB.getBinding("items")?.filter(aFilters);
                    }
                }
            }

            // Ensure values are set back in UI
            oCountryCB.setValue(sCountry);
            oStateCB.setValue(sState);
            oSourceCB.setValue(sSource);
        },
        // onCancelPress: function () {
        //     this.resetAllBookingData()
        //     var oRouter = this.getOwnerComponent().getRouter()
        //     oRouter.navTo("RouteHostel")
        // },
        onCancelPress: function () {
            const oUser = this._oLoggedInUser;
            const oUIModel = this.getOwnerComponent().getModel("UIModel");

            if (oUser && oUser.UserID) {
                oUIModel.setProperty("/isLoggedIn", true);
            } else {
                oUIModel.setProperty("/isLoggedIn", false);
            }
            this._isPersonUIInitialized = false;
            this._mustRecreatePersonUI = true;
            this._lastPersonCount = null;
            this._iSelectedStepIndex = 0;
            this._oSelectedStep = null;
            this.resetAllBookingData()
            var oRouter = this.getOwnerComponent().getRouter()
            oRouter.navTo("RouteHostel")
        },

        resetAllBookingData: function () {
            const oHostelModel = this.getView().getModel("HostelModel");

            // ---- RESET MODEL COMPLETELY ----
            oHostelModel.setData({
                Persons: [],
                SelectedMonths: "",
                SelectedPriceType: "",
                StartDate: "",
                EndDate: "",
                Price: "",
                FinalPrice: "",
                GrandTotal: "",
                TotalFacilityPrice: "",
                TotalDays: "",
                OverallTotalCost: "",
                ForBothSelected: false,
                Facilities: [],
                Documents: [],
                PaymentDetails: {}
            });

            oHostelModel.refresh(true);
            // ---- RESET UI ELEMENTS ----
            // Personal container (remove all generated forms)
            const oVBox = this.getView().byId("idPersonalContainer1");
            if (oVBox) {
                oVBox.destroyItems();
            }

            // Clear room type, branch, UPI, bank, amount etc
            const clearIds = [
                "GI_Roomtype", "idStartDate1", "idEndDate1", "idUPIID",
                "idBankName", "idAmount", "idPaymentTypeField", "idTransactionID",
                "idPaymentDate", "idCurrency"
            ];

            clearIds.forEach(id => {
                const ctrl = sap.ui.getCore().byId(id) || this.getView().byId(id);
                if (ctrl?.setValue) ctrl.setValue("");
                if (ctrl?.setSelectedKey) ctrl.setSelectedKey("");
            });

            // Reset summary page text fields
            const summaryFields = ["idPrice3", "idGrandTotal", "idTotalDays"];
            summaryFields.forEach(id => {
                const fld = this.getView().byId(id);
                if (fld?.setText) fld.setText("");
            });

            // ---- RESET WIZARD (IF USING) ----
            const oWizard = this.byId("BookRoomWizard");
            if (oWizard) {
                oWizard.discardProgress(oWizard.getSteps()[0]);
                oWizard.goToStep(oWizard.getSteps()[0]);
            }
        },

        // onPressEditSave: async function (oEvent) {
        //     var oButton = oEvent.getSource();
        //     var oViewModel = this.getView().getModel("viewModel");
        //     var bEditMode = oViewModel.getProperty("/editMode");
        //     var oHostelModel = this.getView().getModel("HostelModel");
        //     var oData = oHostelModel.getData();

        //     if (!bEditMode) {
        //         // Before entering edit mode, ensure bed types are loaded
        //         await this.BedTypedetails();

        //         // Switch to edit mode
        //         oViewModel.setProperty("/editMode", true);
        //         oButton.setText("Save");
        //     } else {

        //         oViewModel.setProperty("/editMode", false);
        //         oButton.setText("Edit");

        //         try {
        //             //  Build Booking data
        //             const bookingData = [{
        //                 BookingDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
        //                 RentPrice: oData.GrandTotal ? oData.GrandTotal.toString() : "0",
        //                 RoomPrice: oData.RoomPrice || "0",
        //                 NoOfPersons: oData.noofperson || 1,
        //                 Customerid: oData.CustomerId,
        //                 StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
        //                 EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
        //                 Status: "Updated",
        //                 PaymentType: oData.PaymentType || "",
        //                 BedType: oData.BedType || ""
        //             }];

        //             //  Build Facility data
        //             const facilityData = [];
        //             if (oData.AllSelectedFacilities && oData.AllSelectedFacilities.length > 0) {
        //                 oData.AllSelectedFacilities.forEach(fac => {
        //                     facilityData.push({
        //                         PaymentID: "",
        //                         FacilityName: fac.FacilityName,
        //                         FacilitiPrice: fac.Price,
        //                         StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
        //                         EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
        //                         PaidStatus: "Pending"
        //                     });
        //                 });
        //             }
        //             //  Build Personal Information
        //             const personData = [{
        //                 Salutation: oData.Salutation || "",
        //                 CustomerName: oData.FullName || "",
        //                 UserID: oData.UserID || "",
        //                 CustomerID: oData.CustomerID || "",
        //                 STDCode: oData.STDCode || "",
        //                 MobileNo: oData.MobileNo || "",
        //                 Gender: oData.Gender || "",
        //                 DateOfBirth: oData.DateOfBirth ? oData.DateOfBirth.split("/").reverse().join("-") : "",
        //                 CustomerEmail: oData.CustomerEmail || "",
        //                 Country: oData.Country || "",
        //                 State: oData.State || "",
        //                 City: oData.City || "",
        //                 PermanentAddress: oData.Address || "",
        //                 Booking: bookingData,
        //                 FacilityItems: facilityData,
        //             }];

        //             //  Final payload structure
        //             const oPayload = personData;
        //             var custid = bookingData[0].Customerid
        //             await this.ajaxUpdateWithJQuery("HM_Customer", {
        //                 data: oPayload,
        //                 filters: {
        //                     CustomerID: custid
        //                 }
        //             });
        //             MessageToast.show(this.i18nModel.getText("bookingDetailsUpdatedSuccessfully"));

        //         } catch (err) {
        //             console.error("Error during update:", err);
        //             MessageBox.error("Failed to Update Booking Details: " + err.message);
        //         }
        //     }
        // },

        onSelectionChange: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) return;
            var sSelectedBedTypeID = oSelectedItem.getKey();

            var oBedTypeModel = this.getView().getModel("BedTypeModel");
            var aBedTypes = oBedTypeModel.getData();

            // Find selected bed type object
            var oSelectedBedType = aBedTypes.find(function (item) {
                return item.BedTypeID === sSelectedBedTypeID;
            });

            if (oSelectedBedType) {
                var oHostelModel = this.getView().getModel("HostelModel");

                // Update both RoomType and RoomPrice
                oHostelModel.setProperty("/RoomType", oSelectedBedType.BedTypeName);
                oHostelModel.setProperty("/RoomPrice", oSelectedBedType.Price);

                MessageToast.show("Room Type changed to " + oSelectedBedType.BedTypeName);
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
    });
});