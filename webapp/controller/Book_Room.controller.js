sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "../utils/validation",
    "sap/ui/core/BusyIndicator",
], function (
    BaseController,
    JSONModel,
    Formatter, utils,
    BusyIndicator
) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Book_Room", {
        // _isProfileRequested: false,
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteBookRoom").attachMatched(this._onRouteMatched, this);
        },


        _onRouteMatched: function () {
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

            // 🟦 RESET VALUES EVERY TIME ROUTE LOADS
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
                Year: false
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
            this._fetchCommonData("Country", "CountryModel", "");
            this._fetchCommonData("State", "StateModel");
            this._fetchCommonData("City", "CityModel");

            this.ajaxReadWithJQuery("Currency", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "CurrencyModel");
            }).catch((err) => {
                console.error("Error fetching currency data:", err);
            });

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
            // this.resetAllBookingData()
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
            let oHostelModel = sap.ui.getCore().getModel("HostelModel").getData();
            let oBranch = oHostelModel.BranchCode
            const filter = {
                Brach: oBranch
            };
            const Response = await this.ajaxReadWithJQuery("HM_Facilities", filter);

            // Extract array safely
            const aFacilities = Response?.data || [];

            // Helper function to convert Base64 → data:image URL
            const convertBase64ToImage = (base64String, fileType) => {
                if (!base64String) return "./image/Fallback.png";
                let sBase64 = base64String.replace(/\s/g, "");
                try {
                    if (!sBase64.startsWith("iVB") && !sBase64.startsWith("data:image")) {
                        const decoded = atob(sBase64);
                        if (decoded.startsWith("iVB")) sBase64 = decoded;
                    }
                } catch (e) {
                    console.warn("Base64 decode error:", e);
                }
                const mimeType = fileType || "image/jpeg";
                if (sBase64.startsWith("data:image")) return sBase64;
                return `data:${mimeType};base64,${sBase64}`;
            };

            // Convert images and prepare data
            const aFinalFacilities = aFacilities.map(f => ({
                FacilityID: f.ID,
                FacilityName: f.FacilityName,
                Image: convertBase64ToImage(f.Photo1, f.Photo1Type),
                PricePerHour: f.PerHourPrice,
                PricePerDay: f.PerDayPrice,
                PricePerMonth: f.PerMonthPrice,
                PricePerYear: f.PerYearPrice,
                UnitText: f.UnitText,
                Currency: f.Currency,
                BranchCode: f.BranchCode
            }));

            //  Wrap in object for proper binding
            const oFacilityModel = new JSONModel({
                Facilities: aFinalFacilities
            });
            oView.setModel(oFacilityModel, "FacilityModel");
        },

        _checkMandatoryFields: function () {
            const oModel = this.getView().getModel("HostelModel");
            const aPersons = oModel.getProperty("/Persons") || [];
            let bAllValid = true;

            aPersons.forEach((oPerson, iIndex) => {
                // List all your required fields here
                const aFields = [
                    { key: "FullName", label: "Full Name" },
                    { key: "DateOfBirth", label: "Date of Birth" },
                    { key: "Gender", label: "Gender" },
                    { key: "MobileNo", label: "Mobile" },
                    { key: "CustomerEmail", label: "Email" },
                    { key: "Country", label: "Country" },
                    { key: "State", label: "State" },
                    { key: "City", label: "City" },
                    { key: "Address", label: "Address" }
                ];
                aFields.forEach(field => {
                    const sValue = oPerson[field.key];
                    if (!sValue || sValue.trim() === "") {
                        bAllValid = false;
                    }
                });
            });

            return bAllValid;
        },

        onDialogClose: function () {
            this._oLoginAlertDialog.close()
        },

        _checkMandatoryFields: function () {
            const oModel = this.getView().getModel("HostelModel");
            const aPersons = oModel.getProperty("/Persons") || [];
            let aMissingFields = [];

            aPersons.forEach((person, index) => {
                let prefix = "Person " + (index + 1) + ": ";

                if (!person.FullName) aMissingFields.push(prefix + "Full Name");
                if (!person.DateOfBirth) aMissingFields.push(prefix + "Date of Birth");
                if (!person.Gender) aMissingFields.push(prefix + "Gender");
                if (!person.CustomerEmail) aMissingFields.push(prefix + "Email");
                if (!person.Country) aMissingFields.push(prefix + "Country");
                if (!person.State) aMissingFields.push(prefix + "State");
                if (!person.City) aMissingFields.push(prefix + "City");
                if (!person.MobileNo) aMissingFields.push(prefix + "Mobile No");
                if (!person.Address) aMissingFields.push(prefix + "Address");
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
                                            if (!oUser ||!oUser.EmployeeID) {
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

                                                // 🔥 FIX: You forgot these
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
                                                sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "signInusername").setValue("").setValueState("None");
                                                sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "signinPassword").setValue("").setValueState("None");
                                                sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "signInuserid").setValue("").setValueState("None");
                                                //    sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "signupvisible").setVisible(false)
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
                                            oLoginModel.setProperty("/DateOfBirth", oUser.DateOfBirth || oUser.DateofBirth);
                                            const DOB = that.Formatter.DateFormat(oUser.DateOfBirth)
                                            // Already logged in → auto-fill
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
                            placeholder: "Enter Full Name",
                            width: "100%",
                            value: "{HostelModel>/Persons/" + i + "/FullName}",
                            maxLength: 40
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
                            formatter: that.DateFormat,
                            valueFormat: "dd/MM/yyyy",
                            displayFormat: "dd/MM/yyyy",
                            maxDate: (function () {
                                // Calculate today's date minus 10 years
                                const oToday = new Date();
                                oToday.setFullYear(oToday.getFullYear() - 20);
                                return oToday;
                            })(),
                            placeholder: "Select Date of Birth",
                            change: function (oEvent) {
                                const oDate = oEvent.getSource().getDateValue();
                                if (oDate > new Date()) {
                                    sap.m.MessageToast.show("Date of Birth cannot be in the Future.");
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
                            placeholder: "Enter Email",
                            width: "100%",
                            value: "{HostelModel>/Persons/" + i + "/CustomerEmail}"
                        }),

                        new sap.m.Label({
                            text: "Country",
                            required: true,
                        }),

                        new sap.m.ComboBox({
                            placeholder: "Select Country",
                            width: "100%",
                            selectedKey: "{HostelModel>/Persons/" + i + "/Country}",
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
                                    aPersons[i].MobileMax = 20; // or any other rule
                                }

                                // Filter states (existing logic)
                                const oStateCombo = sap.ui.getCore().byId(that.createId("ID_State_" + i));
                                oStateCombo.getBinding("items").filter([
                                    new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                                ]);

                                // Also set UI input maxLength for immediate UX feedback if input exists
                                const oMobileInput = sap.ui.getCore().byId(that.createId("ID_Mobile_" + i));
                                if (oMobileInput) {
                                    oMobileInput.setMaxLength(aPersons[i].MobileMax);
                                    // applyChanges is optional — not relied on by liveChange because we read from model
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
                            placeholder: "Select State",
                            width: "100%",
                            id: that.createId("ID_State_" + i),
                            selectedKey: "{HostelModel>/Persons/" + i + "/State}",
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
                                    new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sStateName),
                                    new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, oCountryObj?.code)
                                ]);
                                oModel.refresh(true);
                            }
                        }),

                        new sap.m.Label({
                            text: "City",
                            required: true,
                        }),

                        new sap.m.ComboBox({
                            placeholder: "Select City",
                            width: "100%",
                            id: that.createId("ID_City_" + i),
                            selectedKey: "{HostelModel>/Persons/" + i + "/City}",
                            items: {
                                path: "CityModel>/", length: 1000, showSecondaryValues: true,
                                template: new sap.ui.core.ListItem({
                                    key: "{CityModel>cityName}",
                                    text: "{CityModel>cityName}",
                                    additionalText: "{CityModel>branchCode}"
                                })
                            },
                            change: function (oEv) {
                                const oSel = oEv.getSource().getSelectedItem();
                                const aPersons = oModel.getProperty("/Persons");
                                aPersons[i].City = oSel ? oSel.getText() : "";
                                oModel.refresh(true);
                            }
                        }),

                        new sap.m.Label({
                            text: "Mobile No",
                            required: true,
                        }),

                        new sap.m.Input({
                            
                            value: "{HostelModel>/Persons/" + i + "/STDCode}",
                        }),

                        new sap.m.Input({
                            placeholder: "Enter Mobile No",
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
                                    // exact 10 digits required
                                    if (sValue.length !== 10) {
                                        oInput.setValueState("Error");
                                        oInput.setValueStateText("Mobile No must be exactly 10 Digits");
                                    }
                                    // update model value for MobileNo
                                    oModel.setProperty("/Persons/" + i + "/MobileNo", sValue);
                                    return;
                                }

                                // Other countries: minimum 4 digits (example rule)
                                if (sValue.length < 4) {
                                    oInput.setValueState("Error");
                                    oInput.setValueStateText("Mobile Number must be at least 4 Digits");
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
                            placeholder: "Enter Address",
                            width: "100%",
                            value: "{HostelModel>/Persons/" + i + "/Address}",
                            placeholder: "Enter Permanent Address",
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
                            placeholder: "Select Document Type",
                            width: "100%",
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
                            placeholder: "Choose File",
                            width: "100%",
                            fileType: ["jpg", "jpeg", "png"],
                            mimeType: ["image/jpeg", "image/png"],
                            multiple: false,
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

    // 🔴 Validation: Document Type must be selected
    if (!sDocType) {
        sap.m.MessageBox.error("Please select Document Type before uploading.");

        // Reset FileUploader
        oUploader.clear();
        return;
    }

    // 🔴 File size validation (2 MB)
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
    if (oFile.size > MAX_SIZE) {
        sap.m.MessageBox.error(
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

                     new sap.m.Button({
    text: "Clear",
    type: "Transparent",
    tooltip: "Clear Document",
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
            sap.m.MessageToast.show("Unable to locate uploader");
            return;
        }

        const index = oUploader.data("index");

        // 1️⃣ Clear model data
        oModel.setProperty("/Persons/" + index + "/Documents", []);
        oModel.setProperty("/Persons/" + index + "/DocumentType", "");

        // 2️⃣ Clear uploader UI
        oUploader.clear();

        // 3️⃣ Refresh model
        oModel.refresh(true);
    }
})




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

                                    // -------------------------
                                    // CHECKBOX CHECKED (Copy Person 1 -> All)
                                    // -------------------------
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
                            justifyContent: "SpaceAround",
                            items: {
                                path: "FacilityModel>/Facilities",
                                filters: [
                                    new sap.ui.model.Filter(
                                        "BranchCode",
                                        sap.ui.model.FilterOperator.EQ,
                                        oModel.getProperty("/BranchCode")
                                    )
                                ],
                                template: new sap.m.VBox({
                                    width: "264px",
                                    height: "230px",
                                    alignItems: "Center",
                                    justifyContent: "Center",
                                    styleClass: "serviceCard",
                                    items: [
                                        // Facility Image + Overlay Name
                                        new sap.m.VBox({
                                            width: "264px",
                                            height: "178px",
                                            styleClass: "imageContainer",
                                            items: [
                                                new sap.m.Image({
                                                    src: "{FacilityModel>Image}",
                                                    width: "264px",
                                                    height: "178px",
                                                    class: "serviceImage",
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
                                                            f => f.FacilityName === facility.FacilityName
                                                        );

                                                        // If selected → REMOVE it
                                                        if (existsIndex > -1) {

                                                            aSelected.splice(existsIndex, 1); // remove
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
                                                        const oActionSheet = that._createFacilityActionSheet(facility, iPersonIndex, oCard);
                                                        oActionSheet.openBy(oEvent.getSource());
                                                    }
                                                }),

                                              
 // Replace HTML formatter with:
new sap.m.Text({
    text: "{FacilityModel>FacilityName}",
    textAlign: "Center"
}).addStyleClass("facilityOverlayText")



                                            ]
                                        }),

                                        // Facility Price (below the image)
                                        new sap.m.Text({
                                            text: {
                                                parts: [
                                                    { path: "FacilityModel>FacilityName" },
                                                    { path: "HostelModel>/Persons/" + i + "/Facilities/SelectedFacilities" }
                                                ],
                                                formatter: function (facilityName, aSelectedFacilities) {

                                                    if (!aSelectedFacilities || !facilityName) return "";

                                                    const found = aSelectedFacilities.find(f => f.FacilityName === facilityName);
                                                    if (!found) return "";

                                                    return found.SelectedPriceType + " " + found.SelectedPrice + " " + (found.Currency || "");
                                                }
                                            }
                                        }).addStyleClass("sapUiTinyMarginTop facilityPriceText")

                                    ]
                                })
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
//                 const oBinding = oFacilityFlex.getBinding("items");
// if (oBinding) {
//     oBinding.attachEventOnce("dataReceived", function () {
//         sap.ui.core.BusyIndicator.hide();   // ✅ HIDE HERE
//     });
// }

                // Add sections for each person
                oVBox.addItem(oForm);

                oVBox.addItem(oDocument);

                oVBox.addItem(oFacilities);
            }
            if (oFacilityModel) oFacilityModel.refresh(true);



             setTimeout(() => {
        sap.ui.core.BusyIndicator.hide();
    }, 2000);

            if (oModel) oModel.refresh(true);

            
        },
        _createFacilityActionSheet: function (facility, iPersonIndex, oCard) {
            var SelectedPriceType = this.getView().getModel("HostelModel").getProperty("/SelectedPriceType")
            const that = this;
            if (this._oFacilityActionSheet) {
                this._oFacilityActionSheet.destroy();
            }

            const aButtons = [];

            function addButton(price, label) {
                // Convert string to number
                const num = Number(price);

                if (price !== "" && price !== null && Number.isFinite(num) && num > 0) {
                    aButtons.push(
                        new sap.m.Button({
                            text: `${label} – ${num} ${facility.Currency}`,
                            press: () => that._setFacilitySelectedPrice(facility, label, num, iPersonIndex, oCard)
                        })
                    );
                }
            }

            if (SelectedPriceType === "Per Day") {
                addButton(facility.PricePerDay, "Per Day");
                addButton(facility.PricePerHour, "Per Hour");

            } else if (SelectedPriceType === "Per Month") {
                addButton(facility.PricePerMonth, "Per Month");
                addButton(facility.PricePerDay, "Per Day");
                addButton(facility.PricePerHour, "Per Hour");

            } else if (SelectedPriceType === "Per Year") {
                addButton(facility.PricePerYear, "Per Year");
                addButton(facility.PricePerMonth, "Per Month");
                addButton(facility.PricePerDay, "Per Day");
                addButton(facility.PricePerHour, "Per Hour");
            }

            this._oFacilityActionSheet = new sap.m.ActionSheet({
                placement: sap.m.PlacementType.Top,
                buttons: aButtons
            });

            this.getView().addDependent(this._oFacilityActionSheet);
            return this._oFacilityActionSheet;
        },

        _setFacilitySelectedPrice: function (facility, selectedType, selectedPrice, iPersonIndex, oCard) {
            const oModel = this.getView().getModel("HostelModel");
            const aPersons = oModel.getProperty("/Persons");

            let selectedFacilities = aPersons[iPersonIndex].Facilities.SelectedFacilities;
            let index = selectedFacilities.findIndex(f => f.FacilityName === facility.FacilityName);

            const oNewFacilityData = {
                FacilityName: facility.FacilityName,
                BranchCode: facility.BranchCode,
                PricePerHour: facility.PricePerHour,
                PricePerDay: facility.PricePerDay,
                PricePerMonth: facility.PricePerMonth,
                PricePerYear: facility.PricePerYear,
                Currency: facility.Currency,
                SelectedPrice: selectedPrice,
                SelectedPriceType: selectedType,
                Image: facility.Image
            };



            if (selectedType === "Per Hour") {
                sap.m.MessageBox.information(
                    "The default Start Time is 09:00 AM and End Time is 10:00 AM.\nIf you want to change it, Please Edit it in the Summary Section.",
                    { title: "Default Time Applied" }
                );
            }
            if (index > -1) {
                selectedFacilities[index] = oNewFacilityData;
            } else {
                selectedFacilities.push(oNewFacilityData);
            }

            oCard.addStyleClass("serviceCardSelected");

            if (oModel.getProperty("/ForBothSelected") && iPersonIndex === 0) {
                for (let p = 1; p < aPersons.length; p++) {
                    aPersons[p].Facilities.SelectedFacilities =
                        aPersons[0].Facilities.SelectedFacilities.map(f => ({ ...f }));
                }
            }
            oModel.setProperty(
                "/HasFacilitySelection",
                aPersons.some(p => p.Facilities.SelectedFacilities.length > 0)
            );

            oModel.refresh(true);
        },
        onPersonCountChange: function (oEvent) {
    const oModel = this.getView().getModel("HostelModel");
    const iPersonCount = oModel.getProperty("/SelectedPerson") || 1;

    if (this._lastPersonCount !== iPersonCount) {
        this._mustRecreatePersonUI = true;
        this._lastPersonCount = iPersonCount;
    }
},


 onDialogNextButton: async function () {

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

    if (bHasError) {
        sap.m.MessageBox.error("Please correct the highlighted errors before proceeding.");
        return; // ⛔ STOP wizard navigation
    }
    const oModel = this.getView().getModel("HostelModel");
    const iPersonCount = oModel.getProperty("/SelectedPerson") || 1;
    // ALWAYS recreate when SelectedPerson changed (flag set in onNoOfPersonSelect)
    if (!this._isPersonUIInitialized || this._mustRecreatePersonUI) {
        this._createDynamicPersonsUI();              // builds UI for current count
        this._isPersonUIInitialized = true;
        this._lastPersonCount = iPersonCount;
        this._mustRecreatePersonUI = false;
    }

    // STEP 1: validations
    if (this._iSelectedStepIndex === 1) {
      
        this._resetCouponAndDiscount();
        const aMissing = this._checkMandatoryFields();
        if (aMissing.length > 0) {
            sap.m.MessageBox.error(
                "Please Fill the following Mandatory Fields:\n\n" + aMissing.join("\n")
            );
            return;
        }
    }

    // wizard navigation (unchanged)
    if (!this._oWizard) {
        this._oWizard = this.byId("TC_id_wizard");
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
}

,
        _resetCouponAndDiscount: function () {
            const oModel = this.getView().getModel("HostelModel");

            // Clear coupon & discount UI
            oModel.setProperty("/CouponCode", "");
            oModel.setProperty("/AppliedDiscount", 0);

            // ❗ Skip totals recalculation if user is still on Step 0 or Step 1
            if (this._iSelectedStepIndex < 2) {
                // Only reset discount value, do NOT calculate totals yet
                oModel.refresh(true);
                return;
            }

            // From Step 2 onward — now calculate totals safely
            const aPersons = oModel.getProperty("/Persons") || [];
            const roomRent = oModel.getProperty("/RoomRent") || 0;

            const result = this.calculateTotals(aPersons, roomRent);

            oModel.setProperty("/OverallTotalCost", result.GrandTotal);
            oModel.setProperty("/CGST", result.CGST);
            oModel.setProperty("/SGST", result.SGST);
            oModel.setProperty("/FinalTotalCost", result.FinalTotal);

            // Reset button text
            const oBtn = this.byId("couponApplyBtn");
            if (oBtn) oBtn.setText("Apply Now");

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

            this.handleButtonsVisibility();
        },
        handleNavigationChange: function (oEvent) {

            this._oSelectedStep = oEvent.getParameter("step");
            this._oWizard = this._oWizard || this.byId("TC_id_wizard");
            this._iSelectedStepIndex = this._oWizard.getSteps().indexOf(this._oSelectedStep);

            this.handleButtonsVisibility();

            const oModel = this.getView().getModel("HostelModel");
            const currentCount = oModel.getProperty("/SelectedPerson") || 1;

            if (this._iSelectedStepIndex === 1) {

        const sStartDate = oModel.getProperty("/StartDate");
        const sEndDate   = oModel.getProperty("/EndDate");

        if (!sStartDate || !sEndDate) {

            sap.m.MessageToast.show(
                "Please select Start Date and End Date before proceeding."
            );

            // ❌ Cancel navigation
            this._oWizard.previousStep();

            // 🔄 Reset index
            this._iSelectedStepIndex = 0;

            // 🔒 Ensure step stays locked
            oModel.setProperty("/IsGeneralInfoValid", false);

            // Update buttons for Step 0
        
            return;
        }
    }

            if (this._iSelectedStepIndex === 1) {

                if (this._mustRecreatePersonUI) {
                    this._createDynamicPersonsUI();
                    this._mustRecreatePersonUI = false;
                }
                return;
            }

            if (this._iSelectedStepIndex === 2) {
                this.TC_onDialogNextButton();
            }
        }

,

        handleButtonsVisibility: function () {
            var oModel = this.getView().getModel("OBTNModel");
            const oHostelModel = this.getView().getModel("HostelModel")
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
                            // fallback: call handler without event so it uses model value

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

                    this.TC_onDialogNextButton()
                    break;
                default:
                    break;
            }
        },
        TC_onDialogNextButton: function () {
            const oView = this.getView();

            const oPriceSummary = oView.byId("idPrice3");
            if (oPriceSummary) {
                oPriceSummary.bindText("HostelModel>/FinalPrice");
            }

            const oHostelModel = oView.getModel("HostelModel");
            const aPersons = oHostelModel.getProperty("/Persons") || [];

            const sStartDate = oHostelModel.getProperty("/StartDate");
            const sEndDate = oHostelModel.getProperty("/EndDate");

            const perUnitPrice = parseFloat(oHostelModel.getProperty("/FinalPrice")) || 0;

            // Convert dates
            const oStartDate = this._parseDate(sStartDate);
            const oEndDate = this._parseDate(sEndDate);

            // =========================================================
            // FIX 1 — Per Day INCLUSIVE calculation  (End - Start + 1)
            // =========================================================
            let iDays = Math.floor((oEndDate - oStartDate) / (1000 * 3600 * 24)) + 1;

            if (iDays <= 0) {
                sap.m.MessageToast.show("End Date must be after Start Date");
                return;
            }

            // ALWAYS GET ORIGINAL BASE PRICE
            const baseRoomRent = parseFloat(oHostelModel.getProperty("/FinalPrice")) || 0;

            // Number of months selected
            const monthsOrYears = parseInt(oHostelModel.getProperty("/SelectedMonths") || "1", 10);

            // =========================================================
            // RENT CALCULATION (unchanged except day formula fixed)
            // =========================================================
            const sPaymentType = oHostelModel.getProperty("/SelectedPriceType") || "";
            let roomRentPerPerson = 0;

            if (sPaymentType === "Per Day") {
                roomRentPerPerson = baseRoomRent * iDays;           // FIXED
            }
            else if (sPaymentType === "Per Month") {
                roomRentPerPerson = baseRoomRent * monthsOrYears;
            }
            else if (sPaymentType === "Per Year") {
                roomRentPerPerson = baseRoomRent * monthsOrYears;
            }

            // Reset flags
            oHostelModel.setProperty("/StopPriceRecalculate", false);
            oHostelModel.setProperty("/StopPriceRecalculateByPerson", false);

            // Continue existing logic...
            const totals = this.calculateTotals(aPersons, sStartDate, sEndDate, perUnitPrice);
            if (!totals) return;

            const aUpdatedPersons = aPersons.map((oPerson, iIndex) => {
                const aPersonFacilities = (totals.AllSelectedFacilities || []).filter(
                    f => f.ID === iIndex
                );

                const totalAmount = aPersonFacilities.reduce((sum, facility) => {
                    return sum + (facility.TotalAmount || 0);
                }, 0);

                const facilityTotal = aPersonFacilities.reduce((sum, f) => {
                    const iPrice = parseFloat(f.Price) || 0;
                    const iDays = parseFloat(f.TotalDays) || 0;
                    return sum + (iPrice * iDays);
                }, 0);

                return {
                    ...oPerson,
                    Documents: oPerson.Documents || [],
                    PersonFacilitiesSummary: aPersonFacilities,
                    AllSelectedFacilities: aPersonFacilities,

                    TotalFacilityPrice: totalAmount,

                    RoomRentPerPerson: roomRentPerPerson,

                    GrandTotal: roomRentPerPerson + totalAmount,

                    TotalDays: iDays
                };
            });

            const totalFacilitySum = aUpdatedPersons.reduce((s, p) => s + p.TotalFacilityPrice, 0);
            const grandTotalSum = aUpdatedPersons.reduce((s, p) => s + p.GrandTotal, 0);

            oHostelModel.setProperty("/Persons", aUpdatedPersons);
            oHostelModel.setProperty("/TotalDays", iDays);
            oHostelModel.setProperty("/TotalFacilityPrice", totalFacilitySum);
            oHostelModel.setProperty("/GrandTotal", grandTotalSum);
            oHostelModel.setProperty("/OverallTotalCost", grandTotalSum);
            oHostelModel.setProperty("/CGST", 0);
            oHostelModel.setProperty("/SGST", 0);
            oHostelModel.setProperty("/FinalTotalCost", 0);
            oHostelModel.setProperty("/IsIndia", false);

            const sCountry = oHostelModel.getProperty("/Country") || "";

            if (sCountry === "India") {
                const subTotal = grandTotalSum;

                const cgst = subTotal * 0.09;
                const sgst = subTotal * 0.09;
                const finalTotal = subTotal + cgst + sgst;

                oHostelModel.setProperty("/IsIndia", true);
                oHostelModel.setProperty("/CGST", cgst);
                oHostelModel.setProperty("/SGST", sgst);
                oHostelModel.setProperty("/FinalTotalCost", finalTotal);
            }
            else {
                oHostelModel.setProperty("/IsIndia", false);
                oHostelModel.setProperty("/CGST", 0);
                oHostelModel.setProperty("/SGST", 0);
                oHostelModel.setProperty("/FinalTotalCost", grandTotalSum);
            }

            oHostelModel.updateBindings(true);
            oHostelModel.refresh(true);
        }
        ,


        // Separated calculation function
        // signature now: calculateTotals(aPersons, sStartDate, sEndDate, roomRentPrice, sPaymentType, iSelectedMonths)
        calculateTotals: function (aPersons, sStartDate, sEndDate, roomRentPrice) {

            const oStartDate = this._parseDate(sStartDate);
            const oEndDate = this._parseDate(sEndDate);

            // ===============================
            // FIX 1 — INCLUSIVE DAY CALCULATION
            // (Per Day = End - Start + 1)
            // ===============================
            let iDays = Math.floor((oEndDate - oStartDate) / (1000 * 3600 * 24)) + 1;

            const diffHours = 1; // keep your logic unchanged

            if (iDays <= 0 && diffHours <= 0) {
                sap.m.MessageToast.show("End Date must be after Start Date");
                return null;
            }

            // ===============================
            // FIX 2 — TRUE CALENDAR MONTH DIFFERENCE
            // ===============================
            let iMonths =
                (oEndDate.getFullYear() - oStartDate.getFullYear()) * 12 +
                (oEndDate.getMonth() - oStartDate.getMonth());

            iMonths = iMonths > 0 ? iMonths : 1; // never 0

            // ===============================
            // FIX 3 — TRUE CALENDAR YEAR DIFFERENCE
            // ===============================
            let iYears = oEndDate.getFullYear() - oStartDate.getFullYear();
            iYears = iYears > 0 ? iYears : 1;

            // DO NOT change anything below this line
            // --------------------------------------

            let totalFacilityPrice = 0;
            let aAllFacilities = [];

            aPersons.forEach((oPerson, iIndex) => {
                const aFacilities = oPerson.Facilities?.SelectedFacilities || [];

                aFacilities.forEach((f) => {

                    var faciliti = oPerson.AllSelectedFacilities?.filter(d => d.FacilityName === f.FacilityName);
                    if (faciliti?.length > 0) {
                        aAllFacilities.push(faciliti[0]);
                    } else {

                        const sType = f.SelectedPriceType;
                        const fPrice = f.SelectedPrice;
                        let fTotal = 0;

                        // USE THE NEW CORRECT DAY/MONTH/YEAR VALUES
                        switch (sType) {
                            case "Per Hour": fTotal = fPrice * diffHours * iDays; break;
                            case "Per Day": fTotal = fPrice * iDays; break;
                            case "Per Month": fTotal = fPrice * iMonths; break;
                            case "Per Year": fTotal = fPrice * iYears; break;
                        }

                        totalFacilityPrice += fTotal;

                        aAllFacilities.push({
                            ID: iIndex,
                            PersonName: oPerson.FullName || `Person ${iIndex + 1}`,
                            FacilityName: f.FacilityName,
                            Price: fPrice,
                            StartDate: sStartDate,
                            EndDate: sEndDate,
                            TotalHours: diffHours,
                            TotalDays: iDays,
                            TotalMonths: iMonths,
                            TotalYears: iYears,
                            TotalAmount: fTotal,
                            Image: f.Image,
                            Currency: f.Currency,
                            Branch: f.BranchCode,
                            UnitText: sType
                        });
                    }
                });
            });

            const grandTotal = totalFacilityPrice + Number(roomRentPrice || 0);

            return {
                TotalHours: diffHours,
                TotalDays: iDays,
                TotalMonths: iMonths,
                TotalYears: iYears,
                TotalFacilityPrice: totalFacilityPrice,
                GrandTotal: grandTotal,
                AllSelectedFacilities: aAllFacilities
            };
        }
        ,



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

        // TC_onDialogBackButton: function () {
        //   const oWizard = this.getView().byId("TC_id_wizard");
        //   oWizard.previousStep();
        // },

       onFieldValidation: function (oEvent) {
    const oView = this.getView();
    const oHostelModel = oView.getModel("HostelModel");
    const oBtnModel = oView.getModel("OBTNModel");

    const oData = oHostelModel.getData();
    const oStartDatePicker = oView.byId("idStartDate1");
    const oEndDatePicker = oView.byId("idEndDate1");

    const sStartDate = oStartDatePicker?.getValue() || "";
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

    // =========================================================
    // MONTHLY PLAN — TRUE CALENDAR MONTH ADDITION
    // =========================================================
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
            oEndDatePicker.setValueStateText("End date cannot be before Start Date");
            sap.m.MessageToast.show("End Date Cannot be before Start Date");
            oHostelModel.setProperty("/EndDate", "");
            oBtnModel.setProperty("/Next", false);
            return;
        }

        oHostelModel.setProperty("/TotalDays", diffDays);
        oEndDatePicker.setValueState("None");

        if (!this._perDayInfoShown) {

            const sFormattedStartDate = this._formatDateToDDMMYYYY(oStart);
            const sFormattedEndDate = this._formatDateToDDMMYYYY(oEnd);

            const sMessage =
                "Start Date: " + sFormattedStartDate + " – Check-in Time: 11:00 AM\n\n" +
                "End Date: " + sFormattedEndDate + " – Check-out Time: 11:00 AM";

            sap.m.MessageBox.information(sMessage, {
                title: "Check-in / Check-out Information"
            });

            this._perDayInfoShown = true;
        }
    }

    // =========================================================
    // CONTROL “Next” BUTTON
    // =========================================================
    const bEndDateValid = !!(sEndDate && sEndDate.trim() !== "");
    oBtnModel.setProperty("/Next", !!(bAllFilled && bEndDateValid));
}
,


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
                sap.m.MessageToast.show("No Password to Copy");
                return;
            }

            navigator.clipboard.writeText(pwd)
                .then(() => {
                    sap.m.MessageToast.show("Password Copied");
                })
                .catch(() => {

                    try {
                        const oTemp = document.createElement("textarea");
                        oTemp.value = pwd;
                        document.body.appendChild(oTemp);
                        oTemp.select();
                        document.execCommand("copy");
                        document.body.removeChild(oTemp);

                        sap.m.MessageToast.show("Password Copied");

                    } catch (err) {
                        sap.m.MessageToast.show("Copy Failed");
                    }
                });
        },
        onMonthSelectionChange: function (oEvent) {
            const oView = this.getView();
            const oHostelModel = oView.getModel("HostelModel");

            // Selected duration: Per Month / Per Year / Per Day
            const sDuration = oHostelModel.getProperty("/SelectedPriceType");

            // Selected number (1–11)
            const iSelectedMonths = parseInt(oEvent.getSource().getSelectedKey() || "1", 10);
            oHostelModel.setProperty("/SelectedMonths", iSelectedMonths.toString());

            const sStartDate = oView.byId("idStartDate1")?.getValue() || "";

            if (!sStartDate) {
                sap.m.MessageToast.show("Please Select Start Date First.");
                return;
            }

            // Convert dd/MM/yyyy → Date object
            const oStart = this._parseDate(sStartDate);
            if (!(oStart instanceof Date) || isNaN(oStart)) {
                sap.m.MessageToast.show("Invalid Start Date.");
                return;
            }

            // Work on a copy
            let oEnd = new Date(oStart);

            // ⭐ REAL DATE LOGIC (CALENDAR ACCURATE)
           if (sDuration === "Per Month") {
    oEnd.setMonth(oEnd.getMonth() + iSelectedMonths);
    oEnd.setDate(oEnd.getDate() - 1); // ⭐ FIX
}
else if (sDuration === "Per Year") {
    oEnd.setFullYear(oEnd.getFullYear() + iSelectedMonths);
    oEnd.setDate(oEnd.getDate() - 1); // ⭐ FIX
}
            else if (sDuration === "Per Day") {
                sap.m.MessageToast.show("Duration is per day. No month/year Selection Needed.");
                return;
            }

            // Convert to dd/MM/yyyy
            const sEndDate = this._formatDateToDDMMYYYY(oEnd);

            // Update model and UI
            oHostelModel.setProperty("/EndDate", sEndDate);
            oView.byId("idEndDate1")?.setValue(sEndDate);
        },
        _formatDateToDDMMYYYY: function (oDate) {
            if (!(oDate instanceof Date)) return "";
            const dd = String(oDate.getDate()).padStart(2, "0");
            const mm = String(oDate.getMonth() + 1).padStart(2, "0");
            const yyyy = oDate.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
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
                this.getOwnerComponent().getRouter().navTo("RouteHostel");
            }
        },

        onRoomDurationChange: function (oEvent) {
            const oView = this.getView();
            const oHostelModel = oView.getModel("HostelModel");
            const oRoomDetailModel = oView.getModel("RoomDetailModel");
            const oBTN = oView.getModel("OBTNModel");

            if (this._oWizard) {
        const aSteps = this._oWizard.getSteps();
        this._oWizard.goToStep(aSteps[0], true); // force General Info
        this._oSelectedStep = aSteps[0];
        this._iSelectedStepIndex = 0;
    }

    // 🔒 LOCK PERSONAL INFO STEP
    oHostelModel.setProperty("/IsGeneralInfoValid", false);
    oBTN.setProperty("/Next", false);
    oBTN.setProperty("/Submit", false);
    oBTN.setProperty("/Cancel", false);

    // 🔒 FORCE INTERNAL WIZARD STATE
    this._iSelectedStepIndex = 0;
    this._oSelectedStep = this._oWizard.getSteps()[0];

            if (!oHostelModel || !oRoomDetailModel || !oBTN) return;

            // Reset all selected facilities
            const aPersons = oHostelModel.getData().Persons;
            aPersons?.forEach(p => p.AllSelectedFacilities = []);

            // ⭐ Now we read value instead of key
            const sValue = oEvent.getSource().getValue();
            // sValue = "Per Day" / "Per Month" / "Per Year"

            const iMonths = parseInt(oHostelModel.getProperty("/SelectedMonths") || "1", 10);
            const sStartDate = oHostelModel.getProperty("/StartDate");

            // Update selected type
            oHostelModel.setProperty("/SelectedPriceType", sValue);

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
                  this._oWizard.previousStep();
                oBTN.setProperty("/Month", false);
                oHostelModel.setProperty("/StartDate", "");
                oHostelModel.setProperty("/EndDate", "");
                oEndDatePicker.setEditable(true);
                oBTN.setProperty("/Next", false);
                return;
            }

            /** ⭐ Per Month / Per Year → automatic end date */
            if (sValue === "Per Month" || sValue === "Per Year") {
                  this._oWizard.previousStep();
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
                "fpUserId", "fpUserName", "fpOTP",
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
            const v = e.getParameter("value").trim();
            sap.ui.getCore().byId("btnOtpVerify").setEnabled(v !== "");
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
                input.setValueStateText("Enter valid 6-digit OTP");
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
            const ctrlUserId = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInuserid");
            const ctrlUserName = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInusername");
            const ctrlPassword = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signinPassword");
            const ctrlOTP = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInOTP");

            var sUserid = ctrlUserId && ctrlUserId.getValue ? ctrlUserId.getValue().trim() : "";
            var sUsername = ctrlUserName && ctrlUserName.getValue ? ctrlUserName.getValue().trim() : "";
            var sPassword = ctrlPassword && ctrlPassword.getValue ? ctrlPassword.getValue() : "";
            const sOTP = ctrlOTP && ctrlOTP.getValue ? ctrlOTP.getValue().trim() : "";

            // --- VALIDATION ---
            // Always validate UserID and UserName
            if (!utils._LCvalidateMandatoryField(ctrlUserId, "ID") ||
                !utils._LCvalidateMandatoryField(ctrlUserName, "ID")) {
                sap.m.MessageToast.show("Make Sure all the Mandatory Fields are Filled/Validate the Entered Value");
                return;
            }

            // Validate password only when in password login mode
            if (!isOTP) {
                if (!utils._LCvalidatePassword(ctrlPassword)) {
                    // _LCvalidatePassword should set value state on ctrlPassword on failure,
                    // but we'll set explicitly to be safe
                    if (ctrlPassword) {
                        ctrlPassword.setValueState("Error");
                        ctrlPassword.setValueStateText("Enter a Valid Password");
                    }
                    sap.m.MessageToast.show("Enter a Valid Password");
                    return;
                } else if (ctrlPassword) {
                    ctrlPassword.setValueState("None");
                }
            }

            try {
                sap.ui.core.BusyIndicator.show(0);
                let payload, oResponse;

                if (isOTP) {
                    // OTP-specific flow (keeps your original checks)
                    const vm = this.getView().getModel("LoginViewModel");
                    const showOTPField = vm.getProperty("/showOTPField");
                    const isOtpEntered = vm.getProperty("/isOtpEntered");
                    // const otpCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInOTP").getValue();

                    // OTP control may not exist if not rendered — guard it
                    const otpCtrl = ctrlOTP || { setValueState: function () { }, setValueStateText: function () { } };

                    // 1️⃣ OTP has NOT been generated
                    if (!showOTPField) {
                        sap.m.MessageToast.show("Please Generate OTP First.");
                        return;
                    }

                    // 2️⃣ OTP was generated but user has not typed anything
                    if (!isOtpEntered) {
                        otpCtrl.setValueState("Error");
                        otpCtrl.setValueStateText("Enter Valid 6-digit OTP");
                        sap.m.MessageToast.show("Enter a Valid 6-digit OTP");
                        return;
                    }

                    // 3️⃣ Validate OTP format strictly
                    if (!/^\d{6}$/.test(sOTP)) {
                        otpCtrl.setValueState("Error");
                        otpCtrl.setValueStateText("Enter a Valid 6-digit OTP");
                        sap.m.MessageToast.show("Enter a Valid 6-digit OTP");
                        return;
                    }

                    // 4️⃣ Backend verification
                    const isValid = await this._verifyOTPWithBackend(sOTP);
                    if (!isValid) {
                        sap.m.MessageToast.show("Incorrect OTP");
                        return;
                    }

                    // 5️⃣ Construct payload and continue login
                    payload = { UserID: sUserid, UserName: sUsername, OTP: sOTP };
                    oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);
                } else {
                    // -------------------------- PASSWORD MODE -------------------------
                    const passCtrl = ctrlPassword;

                    // Required (this was already validated above, but keep a runtime guard)
                    if (!sPassword) {
                        if (passCtrl) {
                            passCtrl.setValueState("Error");
                            passCtrl.setValueStateText("Password is Required");
                        }
                        sap.m.MessageToast.show("Password is Required");
                        return;
                    }

                    // Format validation (already done above, but keep guard)
                    if (!utils._LCvalidatePassword(passCtrl)) {
                        if (passCtrl) {
                            passCtrl.setValueState("Error");
                            passCtrl.setValueStateText("Enter a Valid Password");
                        }
                        sap.m.MessageToast.show("Enter a Valid Password");
                        return;
                    }

                    if (passCtrl) passCtrl.setValueState("None");

                    payload = {
                        UserID: sUserid,
                        UserName: sUsername,
                        Password: btoa(sPassword)
                    };

                    oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);
                }

                const oMatchedUser = oResponse?.data?.[0];

                if (!oMatchedUser || !oMatchedUser.UserID) {
                    sap.m.MessageToast.show("Invalid Credentials");
                    return;
                }

                // ---------- rest of your existing success logic (unchanged) ----------
                oLoginModel.setProperty("/EmployeeID", oMatchedUser.UserID);
                oLoginModel.setProperty("/UserName", oMatchedUser.UserName);
                oLoginModel.setProperty("/EmailID", oMatchedUser.EmailID);
                oLoginModel.setProperty("/MobileNo", oMatchedUser.MobileNo);
                oLoginModel.setProperty("/Status", oMatchedUser.Status);
                oLoginModel.setProperty("/DateOfBirth", oMatchedUser.DateOfBirth);
                oLoginModel.setProperty("/Gender", oMatchedUser.Gender);
                oLoginModel.setProperty("/Country", oMatchedUser.Country);
                oLoginModel.setProperty("/State", oMatchedUser.State);
                oLoginModel.setProperty("/City", oMatchedUser.City);
                oLoginModel.setProperty("/Address", oMatchedUser.Address);
                oLoginModel.setProperty("/STDCode", oMatchedUser.STDCode);
                oLoginModel.setProperty("/Salutation", oMatchedUser.Salutation);

                this._oLoggedInUser = oMatchedUser;
                // Clear input fields
                if (ctrlUserName) ctrlUserName.setValue("");
                if (ctrlPassword) ctrlPassword.setValue("");

                // Close dialog
                if (oFragment) oFragment.close();

                // Fill Persons array and other UI updates (keep your logic)
                const oHostelModel = this.getView().getModel("HostelModel");
                const aPersons = oHostelModel.getProperty("/Persons") || [];

                const DOB = this.Formatter.DateFormat(oMatchedUser.DateOfBirth);

                aPersons.forEach((p) => {
                    p.Salutation = oMatchedUser.Salutation || "";
                    p.FullName = oMatchedUser.UserName || "";
                    p.CustomerEmail = oMatchedUser.EmailID || "";
                    p.MobileNo = oMatchedUser.MobileNo || "";
                    p.UserID = oMatchedUser.UserID || "";
                    p.DateOfBirth = DOB || "";
                    p.Gender = oMatchedUser.Gender || "";
                    p.Country = oMatchedUser.Country || "";
                    p.State = oMatchedUser.State || "";
                    p.City = oMatchedUser.City || "";
                    p.Address = oMatchedUser.Address || "";
                    p.STDCode = oMatchedUser.STDCode || "";
                });

                // Auto-check the "Fill Yourself" checkbox
                const oCheck = sap.ui.getCore().byId(this.createId("IDSelfCheck_0"));
                const oUserModel = new JSONModel(oMatchedUser);
                sap.ui.getCore().setModel(oUserModel, "LoginModel");
                if (oCheck) {
                    oCheck.setSelected(true);
                }
                oHostelModel.refresh(true);

            } catch (err) {
                sap.m.MessageToast.show(err.message || "Invalid Credentials, Please try again");
            } finally {
                sap.ui.core.BusyIndicator.hide();
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
                oNew.setValueStateText("Password is Required");
                sap.m.MessageToast.show("Password is Required");
                return;
            }

            // 2) Format rule check
            if (!utils._LCvalidatePassword(oNew)) {
                oNew.setValueState("Error");
                oNew.setValueStateText("Must Contain 1 Uppercase, 1 Lowercase, 1 Number & 1 Special Character");
                return;
            }

            // 3) Required check for Confirm Password
            if (!confirm) {
                oConf.setValueState("Error");
                oConf.setValueStateText("Confirm Password is Required");
                sap.m.MessageToast.show("Confirm Password is Required");
                return;
            }

            // 4) Match both
            if (pass !== confirm) {
                oConf.setValueState("Error");
                oConf.setValueStateText("Passwords do not Match");
                sap.m.MessageToast.show("Passwords do not Match");
                return;
            }

            // 🔥 PASSED ALL VALIDATIONS → SUCCESS STATE
            oConf.setValueState("None");
            // oConf.setValueStateText("Passwords matched");
            sap.ui.core.BusyIndicator.show(0);
            try {
                await this.ajaxUpdateWithJQuery("HM_Login", {
                    data: { Password: btoa(pass) },
                    filters: { UserID: this._oResetUser?.UserID }
                });


                sap.m.MessageBox.success("Password Updated Successfully", {
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
                sap.m.MessageToast.show("Password Reset Failed");
            }
            finally {
                sap.ui.core.BusyIndicator.hide();  // ALWAYS stop
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
            const isValid =
                utils._LCvalidateMandatoryField(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpUserId"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpUserName"), "ID");

            if (!isValid) {
                sap.m.MessageToast.show("Please Fill all Mandatory Fields.");
                return;
            }

            const oIdCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpUserId");
            const oNameCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpUserName");

            const sUserId = oIdCtrl.getValue().trim();
            const sUserName = oNameCtrl.getValue().trim();

            const payload = {
                UserID: sUserId,
                UserName: sUserName,
                Type: "OTP"
            };

            sap.ui.core.BusyIndicator.show(0);

            try {
                const oResp = await this.ajaxCreateWithJQuery("HostelSendOTP", payload);

                if (oResp?.success) {
                    sap.m.MessageToast.show("OTP Sent! Check your Email.");
                    alert(oResp.OTP);

                    this._oResetUser = { UserID: sUserId, UserName: sUserName };
                    // ✅ Start resend cooldown
                    this._startOtpCooldown(20);


                    this.getView().getModel("LoginViewModel").setProperty("/forgotStep", 2);
                } else {
                    sap.m.MessageToast.show("No User Found with Given ID / Name");
                }

            } catch (err) {
                sap.m.MessageToast.show("Record not found\nPlease check your\nUser ID / User Name");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _verifyOTPWithBackend: async function (otp) {
            sap.ui.core.BusyIndicator.show(0);

            try {
                const oPayload = {
                    UserID: this._oResetUser.UserID,
                    UserName: this._oResetUser.UserName,
                    OTP: otp.trim()
                };

                // Call the BaseController Generic Read method
                const oResp = await this.ajaxReadWithJQuery("HM_Login", oPayload);

                return oResp?.success === true;

            } catch (err) {
                console.error("OTP Verify Error:", err);
                return false;

            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },
        onPressOTP: async function () {
            const oUserIdCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInuserid");
            const oUserNameCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInusername");

            const sUserId = oUserIdCtrl.getValue().trim();
            const sUserName = oUserNameCtrl.getValue().trim();

            // Validate inputs
            if (!utils._LCvalidateMandatoryField(oUserIdCtrl, "ID") ||
                !utils._LCvalidateMandatoryField(oUserNameCtrl, "ID")) {
                sap.m.MessageToast.show("Enter Valid User ID and User Name");
                return;
            }

            const payload = {
                UserID: sUserId,
                UserName: sUserName,
                Type: "OTP"
            };

            sap.ui.core.BusyIndicator.show(0);

            try {
                const oResp = await this.ajaxCreateWithJQuery("HostelSendOTP", payload);

                if (oResp?.success) {

                    sap.m.MessageToast.show("OTP Sent! Check your Email.");
                    alert(oResp.OTP);

                    this._oResetUser = { UserID: sUserId, UserName: sUserName };

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
                    sap.m.MessageToast.show("User not Found or Unable to Send OTP.");
                }

            } catch (err) {
                sap.m.MessageToast.show("Invalid Credentials, Please try again");
            } finally {
                sap.ui.core.BusyIndicator.hide();
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
                oOtpInput.setValueStateText("Please Enter OTP");
                sap.m.MessageToast.show("Enter OTP");
                return;
            }

            if (!/^\d{6}$/.test(otp)) {
                oOtpInput.setValueState(sap.ui.core.ValueState.Error);
                oOtpInput.setValueStateText("Enter a valid 6-digit OTP");
                sap.m.MessageToast.show("Invalid OTP");
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
                sap.m.MessageToast.show("OTP Verification Failed");
                return;
            }

            if (!isValid) {
                sap.m.MessageToast.show("Incorrect OTP");
                return;
            }

            // ✅ OTP accepted: reset resend cooldown state
            this._resetOtpCooldown();

            // --------------------------
            // 📌 Forgot Password Flow
            // --------------------------
            if (flow === "forgot") {
                vm.setProperty("/forgotStep", 3);
                return;
            }

            // --------------------------
            // 📌 Normal OTP Login Flow
            // --------------------------
            try {

                const resp = await this.ajaxReadWithJQuery("HM_Login", {
                    UserID: this._oResetUser?.UserID,
                    UserName: this._oResetUser?.UserName,
                    OTP: otp
                });

                sap.m.MessageToast.show("Login Successful!");
                this._setLoggedInUser(resp.data[0]);
                this._resetAllAuthFields();
                this._oSignDialog.close();

            } catch (e) {

                sap.m.MessageToast.show("Login Failed");
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

            sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpUserId").setValue("");
            sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpUserName").setValue("");
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
                "fpUserId", "fpUserName", "fpOTP", "newPass", "confPass", "loginOTP"
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
                sap.m.MessageToast.show("Please Fill all Mandatory Fields Correctly.");
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

            console.log("SignUp Payload:", payload);
            sap.ui.core.BusyIndicator.show(0);
            try {
                const oResp = await this.ajaxCreateWithJQuery("HM_Login", payload);

                if (!oResp || oResp.success !== true) {
                    sap.m.MessageToast.show("Registration Failed! Please try again.");
                    console.error("SignUp Error Response:", oResp);
                    return;
                }

                sap.m.MessageBox.success("Registration Successful", {
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

                sap.m.MessageBox.error(sMsg, {
                    title: "Registration Failed"
                });

                console.error("SignUp Error:", err);

            } finally {
                sap.ui.core.BusyIndicator.hide();
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
                new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
            ]);

            // release cities only if country is valid
            const oCountry = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpCountry");
            const sCountryCode =
                oCountry.getSelectedItem()?.getAdditionalText()?.trim();

            if (!sCountryCode || !sStateText) return;

            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", "EQ", sStateText),
                new sap.ui.model.Filter("countryCode", "EQ", sCountryCode)
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
                    new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
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
                oInput.setValueStateText("Confirm Password is Required");
                return false;
            }

            // Compare
            if (pass !== confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Passwords do not Match");
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
                oDP.setValueStateText("Date of Birth is Required");
                return false;
            }

            // Age validation (10–100)
            const today = new Date();
            let age = today.getFullYear() - v.getFullYear();
            const m = today.getMonth() - v.getMonth();

            if (m < 0 || (m === 0 && today.getDate() < v.getDate())) age--;

            if (age < 10 || age > 100) {
                oDP.setValueState("Error");
                oDP.setValueStateText("Age must be between 10 and 100 years");
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
                    new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
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
                oInput.setValueStateText("Select ISD Code First");
                return;
            }

            // 🔥 STRICT validation while typing
            const isValid = utils._LCvalidateISDmobile(oInput, std);

            if (!isValid) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Enter valid Mobile Number");
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
                new sap.ui.model.Filter("stateName", "EQ", "__NONE__")
            ]);
            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
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
                    new sap.ui.model.Filter(
                        "countryCode",
                        sap.ui.model.FilterOperator.EQ,
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
            ["fpUserId", "fpUserName", "fpOTP", "newPass", "confPass"]
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
            ["fpUserId", "fpUserName", "fpOTP", "newPass", "confPass"]
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



        // SM_onChnageSetAndConfirm: function (oEvent) {
        //     utils._LCvalidatePassword(oEvent);
        // },
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

            // ✅ Only generate + validate (NO copying here)
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

            var oPaymentModel = this.getView().getModel("PaymentModel");
            var oHostelModel = this.getView().getModel("HostelModel");

            // Set default values
            oPaymentModel.setProperty("/PaymentDate", this.Formatter.formatDate(new Date()));
            oPaymentModel.setProperty("/PaymentType", "UPI");
            var fAmount = parseFloat(oHostelModel.getProperty("/FinalTotalCost") || 0).toFixed(2);
            oPaymentModel.setProperty("/Amount", parseFloat(fAmount));

            this._oPaymentDialog.open();
        },

        onPaymentTypeSelect: function (oEvent) {
            const index = oEvent.getSource().getSelectedIndex();

            const isUPI = index === 0;
            const isCard = index === 1;
            const isPayOnCheckIn = index === 2;

            this._togglePaymentSections(isUPI, isCard, isPayOnCheckIn);

            var oPaymentModel = this.getView().getModel("PaymentModel");
            var oHostelModel = this.getView().getModel("HostelModel");

            if (isPayOnCheckIn) {
                // No payment needed now
                oPaymentModel.setProperty("/PaymentType", "PayOnCheckIn");
                oPaymentModel.setProperty(
                    "/Amount",
                    Number(oHostelModel.getProperty("/FinalTotalCost")).toFixed(2)
                );

                oPaymentModel.setProperty("/PaymentDate", "");
                return;
            }

            // For UPI and CARD
            oPaymentModel.setProperty("/PaymentType", isUPI ? "UPI" : "CARD");
            oPaymentModel.setProperty("/PaymentDate", this.Formatter.formatDate(new Date()));
            oPaymentModel.setProperty(
                "/Amount",
                Number(oHostelModel.getProperty("/FinalTotalCost")).toFixed(2)
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

            aFields.forEach(id => sap.ui.getCore().byId(id)?.setValue(""));
        },
        
        onAmountChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const sValue = oInput.getValue();

            if (!sValue || sValue === "." || sValue.endsWith(".")) {
                return; // Wait for complete input
            }

            const enteredAmount = parseFloat(sValue);
            const grandTotal = parseFloat(
                this.getView().getModel("HostelModel").getProperty("/FinalTotalCost")
            );

            if (isNaN(enteredAmount) || isNaN(grandTotal)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid amount");
                return;
            }

            if (enteredAmount > grandTotal) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Amount cannot be greater than Grand Total");
            } else {
                oInput.setValueState("None");
            }
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

        onBankNameChange: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onCurrencyChange: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onPaymentTypeChange: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onTransactionIDChange: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onChangeUPIID: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onPaymentDateChange: function (oEvent) {
            const oInput = oEvent.getSource();
            if (!oInput.getValue()) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Select Payment Date");
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
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idPaymentTypeField"), "ID") &&
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idTransactionID"), "ID") &&
                    utils._LCvalidateDate(sap.ui.getCore().byId("idPaymentDate"), "ID")
                );

                if (!isMandatoryValid) {
                    sap.m.MessageToast.show("Please Fill all Mandatory Fields.");
                    return;
                }
            }
            const oAmountInput = sap.ui.getCore().byId("idAmount");
            const rawEntered = (oAmountInput.getValue() || "").replace(/,/g, "").trim();
            const rawGrand = (this.getView().getModel("HostelModel").getProperty("/FinalTotalCost") || "").toString().replace(/,/g, "").trim();

            /* ================= Decimal Completion Guard ================= */
            if (!rawEntered || rawEntered === "." || rawEntered.endsWith(".")) {
                oAmountInput.setValueState("Error");
                oAmountInput.setValueStateText("Please enter a valid amount");
                sap.m.MessageToast.show("Please enter a valid amount");
                return;
            }

            /* ================= Parse After Validation ================= */
            const enteredAmount = parseFloat(rawEntered);
            const grandTotal = parseFloat(rawGrand);

            /* ================= NaN ================= */
            if (isNaN(enteredAmount) || isNaN(grandTotal)) {
                oAmountInput.setValueState("Error");
                sap.m.MessageToast.show("Invalid Amount Format");
                return;
            }

            /* ================= Business Rule ================= */
            if (enteredAmount > grandTotal) {
                oAmountInput.setValueState("Error");
                oAmountInput.setValueStateText("Amount cannot be greater than Grand Total");
                sap.m.MessageToast.show("Amount Cannot be Greater than Grand Total");
                return;
            }
            oAmountInput.setValueState("None");

            try {
                // Format payload according to your new structure
                const formattedPayload = oData.Persons.map((p) => {
                    const bookingData = [];
                    const facilityData = [];

                    //  FIX: Use oData for booking fields, not individual person object
                    if (oData.StartDate) {

                        const totalCost = Number(oData.FinalTotalCost || 0);
                        const noOfPersons = Number(oData.SelectedPerson || oData.Persons.length || 1);
                        const rentPrice = totalCost / noOfPersons;
                        const today = new Date();
                        const todayDate = today.toISOString().split("T")[0];
                        bookingData.push({
                            BookingDate: todayDate,
                            RentPrice: rentPrice.toString(),
                            RoomPrice: oData.FinalPrice,
                            NoOfPersons: oData.Person || oData.Persons.length,
                            StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                            EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                            Status: "New",
                            PaymentType: oData.SelectedPriceType || "",
                            BedType: `${oData.BedType} - ${oData.ACType}`,
                            BranchCode: oData.BranchCode,
                            Currency: oData.Currency,
                            Discount: oData.AppliedDiscount.toString() || "0",
                            CouponCode: oData.CouponCode || "",
                            TotalRoomprice: p.RoomRentPerPerson|| "0",
                            UserID: p.UserID
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
                            Amount: sap.ui.getCore().byId("idAmount").getValue(),
                            PaymentType: sap.ui.getCore().byId("idPaymentTypeField").getValue(),
                            BankTransactionID: sap.ui.getCore().byId("idTransactionID").getValue(),
                            Date: sap.ui.getCore().byId("idPaymentDate").getValue()
                                ? sap.ui.getCore().byId("idPaymentDate").getValue().split("/").reverse().join("-")
                                : "",
                        };

                    }

                    // Store in model temporarily
                    oData.PaymentDetails = paymentDetails;

                    //  Handle both object and string facility formats
                    const aSelectedFacilities = p.AllSelectedFacilities || [];

                    aSelectedFacilities.forEach(fac => {
                        let facilityPrice = fac.TotalAmount || 0;
                        let facilityHour = "";
                        let startTime = fac.StartTime || "09";
                        let endTime = fac.EndTime || "10";

                        if (fac.SelectedPriceType === "Per Hour") {

                            if (!fac.TotalHours || Number(fac.TotalHours) <= 0) {
                                facilityHour = "1";      // default
                                startTime = "09";
                                endTime = "10";
                            } else {
                                facilityHour = Number(fac.TotalTime) || "1";
                            }

                        } else {
                            facilityHour = Number(fac.TotalTime) || "1";
                        }

                        facilityData.push({
                            PaymentID: "",
                            FacilityName: fac.FacilityName,
                            FacilitiPrice: facilityPrice,
                            StartDate: fac.StartDate ? fac.StartDate.split("/").reverse().join("-") : "",
                            EndDate: fac.EndDate ? fac.EndDate.split("/").reverse().join("-") : "",
                            PaidStatus: "Pending",
                            UnitText: fac.UnitText,
                            StartTime: startTime,     // ✔ local copy
                            EndTime: endTime,         // ✔ local copy
                            TotalHour: facilityHour,
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
                BusyIndicator.hide()
                // Prepare message text
                //    var oBtn = this.byId("couponApplyBtn");
                //       oBtn.setText("Apply Now")
                oModel.setProperty("/CouponCode", "")
                let sMessage = "Booking Successful!\n\n";

                aBookingDetails.forEach((item, index) => {
                    sMessage += "Booking ID: " + item.BookingID + "\n";
                });

                // Show success box
                sap.m.MessageBox.success(sMessage, {
                    title: "Success",
                    actions: [sap.m.MessageBox.Action.OK],
                    onClose: function () {
                        // Check login status
                        const oLoginModel = sap.ui.getCore().getModel("LoginModel");
                        const isLoggedIn = oLoginModel && oLoginModel.getProperty("/UserID");

                        if (!isLoggedIn) {
                            sap.m.MessageBox.warning(
                                "You are Booking as a guest and you will not be able to see the Booking History.",
                                {
                                    title: "Guest Booking",
                                    actions: [sap.m.MessageBox.Action.OK],
                                    onClose: function () {
                                        // Continue navigation after warning
                                        this._navigateAfterBooking();
                                    }.bind(this)
                                }
                            );
                            return; // STOP further navigation until user clicks OK
                        }
                        // Logged-in user → direct navigation
                        this._navigateAfterBooking();
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

                sap.m.MessageToast.show(errorMsg);
                sap.m.MessageBox.error(errorMsg);
            }
        },
        
        _navigateAfterBooking: function () {
    var oRoute = this.getOwnerComponent().getRouter();
    oRoute.navTo("RouteHostel");

    setTimeout(function () {
        this.resetAllBookingData();

        // 🔑 RESET DYNAMIC UI FLAGS
        this._isPersonUIInitialized = false;
        this._mustRecreatePersonUI = true;
        this._lastPersonCount = null;
        this._iSelectedStepIndex = 0;
        this._oSelectedStep = null;

        // Optional: destroy old dynamic UI explicitly
     

        this.openProfileDialog();
    }.bind(this), 500);

    const oAvatar = this.byId("ProfileAvatar");
    if (oAvatar) {
        oAvatar.setVisible(true);
    }
},




        openProfileDialog: function () {
            this.onPressAvatar()
        },

        _onLogout: function () {
            this._oProfileActionSheet.close();
            // sap.m.MessageToast.show("Logging out...");
            this._oLoggedInUser = null;
            if (this._oProfileDialog) {
                this._oProfileDialog.destroy();
                this._oProfileDialog = null;
            }
            if (this._oProfileActionSheet) {
                this._oProfileActionSheet.destroy();
                this._oProfileActionSheet = null;
            }
            this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", false);
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
        },

        _onEnterProfile: async function () {
            this._oProfileActionSheet.close();
            this._isProfileRequested = true;
            await this.onPressAvatar();
        },

        createAvatarActionSheet: function () {
            if (!this._oProfileActionSheet) {
                this._oProfileActionSheet = new sap.m.ActionSheet({
                    placement: sap.m.PlacementType.Bottom,
                    buttons: [
                        new sap.m.Button({
                            text: "Enter into Profile",
                            icon: "sap-icon://customer",
                            press: this._onEnterProfile.bind(this)
                        }).addStyleClass("myUnifiedBtn"),

                        new sap.m.Button({
                            text: "Logout",
                            icon: "sap-icon://log",
                            press: this._onLogout.bind(this)
                        }).addStyleClass("myUnifiedBtn")
                    ]
                });
                this.getView().addDependent(this._oProfileActionSheet);
            }
        },
        onPressAvatar: async function (oEvent) {
            const oUser = this._oLoggedInUser || {};
            const fullUserData = this._oLoggedInUser || {};
            try {
                const sUserID = oUser.UserID || "";
                if (!sUserID) {
                    sap.m.MessageToast.show("User not Logged in.");
                    return;
                }

                // if (!this._isProfileRequested) {
                //     this.createAvatarActionSheet();
                //     this._oProfileActionSheet.openBy(oEvent.getSource());
                //     return;
                // }
                this._isProfileRequested = false;

                if (!this._oProfileDialog) {
                    this._oProfileDialog = await sap.ui.core.Fragment.load({
                         id: "profileFrag",
                        name: "sap.ui.com.project1.fragment.ManageProfile",
                        controller: this
                    });
                    this.getView().addDependent(this._oProfileDialog);
                }
                const oTempModel = new JSONModel({
                    bookings: [],
                    Payments: [],
                    isEditMode: false,
                    selectedTab: "Booking History",
                    isTableBusy: true
                });

                this._oProfileDialog.setModel(oTempModel, "profileData");
                // oProfileModel.refresh(true); 
                this._oProfileDialog.open();
                // this.byId("id_tabBar").setSelectedKey("Booking History");
                setTimeout(() => {
                    this.byId("id_dialog")?.addStyleClass("dialogBlur");
                }, 200);

                const filter = { UserID: sUserID }
                const response = await this.ajaxReadWithJQuery("CustomerAndPayment", filter);

                const aBookings = response?.BookingData || [];
                const aPayments = response?.PaymentData || [];

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const aBookingData = aBookings.map(booking => {
                    const oStart = booking.StartDate ? new Date(booking.StartDate) : null;
                    if (oStart) {
                        oStart.setHours(0, 0, 0, 0);
                    }

                    const startDate = booking.StartDate ? new Date(booking.StartDate) : null;
                    const endDate = booking.EndDate ? new Date(booking.EndDate) : null;
                    if (startDate) startDate.setHours(0, 0, 0, 0);
                    if (endDate) endDate.setHours(0, 0, 0, 0);

                    let bookingGroup = "Others";
                    if (booking.Status === "Cancelled") {
                        bookingGroup = "Cancelled";
                    } else if (booking.Status === "Completed") {
                        bookingGroup = "Completed";
                    } else if (booking.Status === "New" || booking.Status === "Assigned") {
                        // Ongoing = Today is between StartDate & EndDate
                        if (startDate && endDate && startDate <= today && endDate >= today) {
                            bookingGroup = "Ongoing";
                            // Upcoming = Future StartDate
                        } else if (startDate && startDate > today) {
                            bookingGroup = "Upcoming";
                        }
                    }
                    // const oStart = booking.StartDate ? new Date(booking.StartDate) : null;
                    return {
                        customerName: oUser.Salutation + " " + oUser.UserName,
                        room: booking.BedType || "",
                        Startdate: new Date(booking.StartDate).toLocaleDateString("en-GB"),
                        EndDate: booking.EndDate ? new Date(booking.EndDate).toLocaleDateString("en-GB") : "",
                        BookingDate: booking.BookingDate ? new Date(booking.BookingDate).toLocaleDateString("en-GB") : "",
                        amount: booking.RentPrice,
                        status: booking.Status,
                        customerID: booking.CustomerID,
                        currency: booking.Currency,
                        BookingID: booking.BookingID?.toString() || "",
                        bookingGroup: bookingGroup
                    }

                });
                // Format PAYMENTS
                const aPaymentData = aPayments.map(payment => ({
                    BookingID: payment.BookingID,
                    InvNo: payment.InvNo?.toString() || "",
                    InvoiceDate: payment.InvoiceDate,
                    CustomerName: payment.CustomerName,
                    TotalAmount: payment.TotalAmount?.toString() || "",
                    DueAmount: payment.DueAmount ? payment.DueAmount.toString() : "Not Applicable",
                    currency: payment.Currency,
                    PaymentGroup: payment.Status || "Others"
                }));

                const oProfileModel = new JSONModel({
                    ...fullUserData,
                    isEditMode: false,
                    photo: "data:image/png;base64," + oUser.FileContent || "",
                    initials: oUser.UserName ? oUser.UserName.charAt(0).toUpperCase() : "",
                    name: oUser.UserName || "",
                    UserID: oUser.UserID,
                    Salutation: oUser.Salutation,
                    email: oUser.EmailID || "",
                    phone: oUser.MobileNo || "",
                    dob: this.Formatter.DateFormat(oUser.DateOfBirth) || "",
                    gender: oUser.Gender || "",
                    address: oUser.Address || "",
                    State: oUser.State,
                    Country: oUser.Country,
                    City: oUser.City,
                    stdCode: oUser.STDCode,
                    branchCode: oUser.BranchCode,
                    role: oUser.Role,
                    bookings: aBookingData,
                    Payments: aPaymentData,
                    bookingCount: aBookingData.length,
                    paymentCount: aPaymentData.length,
                    selectedTab: "Booking History",
                    aCustomers: aBookingData.map(booking => ({ customerID: booking.customerID || CustomerID, customerName: booking.customerName })),
                    facility: [],
                    isTableBusy: false
                });
                this._oProfileDialog.setModel(oProfileModel, "profileData");
                oProfileModel.setProperty("/isEditMode", false);
                oProfileModel.setProperty("/isTableBusy", false);
                // this.byId("id_dialog").removeStyleClass("dialogBlur");
            } catch (err) {
                console.error("Profile Load Error:", err);
                const oProfileModel = new JSONModel({
                    ...fullUserData,
                    photo: "data:image/png;base64," + oUser.FileContent || "",
                    initials: oUser.UserName ? oUser.UserName.charAt(0).toUpperCase() : "",
                    name: oUser.UserName || "",
                    email: oUser.EmailID || "",
                    phone: oUser.MobileNo || "",
                    dob: this.Formatter.DateFormat(oUser.DateOfBirth) || "",
                    gender: oUser.Gender || "",
                    address: oUser.Address || "",
                    bookings: [],
                    aCustomers: []
                });
                this._oProfileDialog.setModel(oProfileModel, "profileData");
                oProfileModel.setProperty("/isEditMode", false);
                oProfileModel.refresh(true);
                this._oProfileDialog.open();

            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },
onGlobalSearch: function (oEvent) {
    const sQuery = (oEvent.getParameter("newValue") || "").toLowerCase();

    if (!this._oProfileDialog) {
        return;
    }

    const oProfileModel = this._oProfileDialog.getModel("profileData");
    const sSelectedTab = oProfileModel.getProperty("/selectedTab");

    const oTable = sap.ui.core.Fragment.byId(
        "profileFrag",
        sSelectedTab === "Payment"
            ? "Id_PaymentTable"
            : "Id_ProfileaTable"
    );

    if (!oTable) {
        return;
    }

    const oBinding = oTable.getBinding("items");
    if (!oBinding) {
        return;
    }

    let aFilters = [];

    if (sQuery) {
        const fnContains = function (v) {
            return v != null && v.toString().toLowerCase().includes(sQuery);
        };

        if (sSelectedTab === "Payment") {
            aFilters = [
                new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter({ path: "BookingID", test: fnContains }),
                        new sap.ui.model.Filter({ path: "InvNo", test: fnContains }),
                        new sap.ui.model.Filter({ path: "InvoiceDate", test: fnContains }),
                        new sap.ui.model.Filter({ path: "CustomerName", test: fnContains }),
                        new sap.ui.model.Filter({ path: "TotalAmount", test: fnContains }),
                        new sap.ui.model.Filter({ path: "DueAmount", test: fnContains }),
                        new sap.ui.model.Filter({ path: "currency", test: fnContains })
                    ],
                    and: false
                })
            ];
        } else {
            aFilters = [
                new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter({ path: "customerName", test: fnContains }),
                        new sap.ui.model.Filter({ path: "BookingID", test: fnContains }),
                        new sap.ui.model.Filter({ path: "BookingDate", test: fnContains }),
                        new sap.ui.model.Filter({ path: "room", test: fnContains }),
                        new sap.ui.model.Filter({ path: "status", test: fnContains }),
                        new sap.ui.model.Filter({ path: "amount", test: fnContains }),
                        new sap.ui.model.Filter({ path: "currency", test: fnContains })
                    ],
                    and: false
                })
            ];
        }
    }

    //  IMPORTANT: Application-level filter
    oBinding.filter(aFilters, sap.ui.model.FilterType.Application);
},





      onTableUpdateFinished: function (oEvent) {
    this._updateRowCount(oEvent.getSource());
},


 _updateRowCount: function (oTable) {
    if (!oTable || !this._oProfileDialog) {
        return;
    }

    const oProfileModel = this._oProfileDialog.getModel("profileData");
    if (!oProfileModel) {
        return;
    }

    const oBinding = oTable.getBinding("items");
    const iCount = oBinding ? oBinding.getLength() : 0;

    const sId = oTable.getId();

    if (sId.includes("Id_PaymentTable")) {
        oProfileModel.setProperty("/paymentCount", iCount);
    } else {
        oProfileModel.setProperty("/bookingCount", iCount);
    }
}
,


        onPressAvatarEdit: function (oEvent) {
            if (!this._oAvatarActionSheet) {
                this._oAvatarActionSheet = new sap.m.ActionSheet({
                    buttons: [
                        new sap.m.Button({
                            text: "Take Photo",
                            icon: "sap-icon://camera",
                            press: this.onTakePhoto.bind(this)
                        }),
                        new sap.m.Button({
                            text: "Upload from Gallery",
                            icon: "sap-icon://add-photo",
                            press: this.onUploadPhoto.bind(this)
                        }),
                        new sap.m.Button({
                            text: "Remove Photo",
                            icon: "sap-icon://delete",
                            type: "Reject",
                            press: this.onRemovePhoto.bind(this)
                        })
                    ],
                    placement: "Bottom"
                });
                this.getView().addDependent(this._oAvatarActionSheet);
            }
            this._oAvatarActionSheet.openBy(oEvent.getSource());
        },
        _StartCamera: function () {
            var oVideo = document.getElementById("video");
            if (!oVideo) return;

            // Create segmentation instance only once
            if (!this.selfieSegmentation) {
                this.selfieSegmentation = new SelfieSegmentation({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
                    },
                });

                this.selfieSegmentation.setOptions({
                    modelSelection: 1, // 0 = general, 1 = landscape
                });

                // Store segmentation results
                this.latestSegmentation = null;
                this.selfieSegmentation.onResults((results) => {
                    this.latestSegmentation = results;
                });
            }

            // Always create a new Camera instance when starting
            this.camera = new Camera(oVideo, {
                onFrame: async () => {
                    await this.selfieSegmentation.send({ image: oVideo });
                },
                width: 640,
                height: 480,
            });
            this.camera.start();
        },

        _StopCamera: function () {
            if (this.camera) {
                this.camera.stop();
                this.camera = null;
            }
            if (this._cameraStream) {
                this._cameraStream.getTracks().forEach((track) => track.stop());
                this._cameraStream = null;
            }
            var oVideo = document.getElementById("video");
            if (oVideo) {
                oVideo.srcObject = null;
            }
        },

        onTakePhoto: function () {
            if (!this.oCameraDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.ui.com.project1.fragment.SelfieCam",
                    controller: this,
                }).then(
                    function (oDialog) {
                        this.oCameraDialog = oDialog;
                        this.getView().addDependent(this.oCameraDialog);
                        this.oCameraDialog.attachAfterOpen(this._StartCamera.bind(this));
                        this.oCameraDialog.attachAfterClose(this._StopCamera.bind(this));
                        this.oCameraDialog.open();
                    }.bind(this)
                );
            } else {
                this.oCameraDialog.open();
            }
        },

        IC_onCapturePress: function () {
            var oVideo = document.getElementById("video");

            if (!oVideo || !this.latestSegmentation) return;

            const oCanvas = document.createElement("canvas");
            const oContext = oCanvas.getContext("2d");

            oCanvas.width = oVideo.videoWidth;
            oCanvas.height = oVideo.videoHeight;

            oContext.fillStyle = "white";
            oContext.fillRect(0, 0, oCanvas.width, oCanvas.height);

            oContext.drawImage(oVideo, 0, 0, oCanvas.width, oCanvas.height);

            const mask = this.latestSegmentation.segmentationMask;
            oContext.globalCompositeOperation = "destination-in";
            oContext.drawImage(mask, 0, 0, oCanvas.width, oCanvas.height);
            oContext.globalCompositeOperation = "destination-over";
            oContext.fillStyle = "white";
            oContext.fillRect(0, 0, oCanvas.width, oCanvas.height);
            oContext.globalCompositeOperation = "source-over";

            var base64Image = oCanvas.toDataURL("image/png");
            var mimeType = "image/png";
            var imageName = "captured_image.png";

            // remove base64 prefix
            var rawBase64 = base64Image.replace(`data:${mimeType};base64,`, "");

            var oModel = this._oProfileDialog.getModel("profileData");
            oModel.setProperty("/fileName", imageName);
            oModel.setProperty("/fileType", mimeType);
            oModel.setProperty("/fileContent", rawBase64);

            // Add this to update UI avatar
            oModel.setProperty("/photo", base64Image);

            // Upload to backend
            this.updateUserPhoto({
                fileName: imageName,
                fileType: mimeType,
                fileContent: rawBase64
            });

            this._StopCamera();
            this.oCameraDialog.close();
        },

        IC_onPressCloseCameraDialog: function () {
            this._StopCamera();
            if (this.oCameraDialog) {
                this.oCameraDialog.close();
            }
        },

        onUploadPhoto: function () {
            const uploader = sap.ui.getCore().byId("id_fileUploaderAvatar");
            if (!uploader) return;

            setTimeout(() => {
                const oInput = uploader.getFocusDomRef();
                if (!oInput) {
                    console.error("Uploader input not ready");
                    return;
                }
                uploader.clear();
                uploader.setValue("");
                oInput.value = "";
                oInput.accept = "image/*";
                oInput.capture = "";   // remove camera request → gallery
                oInput.click();
            }, 200);
        },

        onAvatarFileSelected: function (oEvent) {
            const file = oEvent.getParameter("files")[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                const fullDataURL = e.target.result;
                const base64 = fullDataURL.split(",")[1]; // remove prefix

                const oModel = this._oProfileDialog.getModel("profileData");
                oModel.setProperty("/photo", fullDataURL);
                await this.updateUserPhoto({
                    fileName: file.name,
                    fileType: file.type,
                    fileContent: base64
                });
            };
            reader.readAsDataURL(file);
        },

        onRemovePhoto: async function () {
            const oModel = this._oProfileDialog.getModel("profileData");
            const initials = oModel.getProperty("/initials");

            oModel.setProperty("/photo", "");
            oModel.setProperty("/initials", initials);
            await this.updateUserPhoto({
                fileName: "",
                fileType: "",
                fileContent: ""
            });
        },

        updateUserPhoto: async function ({ fileName, fileType, fileContent }) {
            try {
                const sUserID = this._oLoggedInUser?.UserID;
                if (!sUserID) {
                    sap.m.MessageToast.show("User not Logged in");
                    return;
                }
                const payload = {
                    data: {
                        FileName: fileName,
                        FileType: fileType,
                        FileContent: fileContent
                    },
                    filters: { UserID: sUserID }
                };
                await this.ajaxUpdateWithJQuery("HM_Login", payload);
                this._oLoggedInUser.FileContent = fileContent;
                this._oLoggedInUser.Photo = "data:image/png;base64," + fileContent;

                sap.m.MessageToast.show("Profile Photo Updated!");

            } catch (err) {
                console.error(err);
                sap.m.MessageToast.show("Failed to Update Profile Photo");
            }
        },

        onPreviewProfilePhoto: function () {
            const sPhoto = this._oProfileDialog.getModel("profileData").getProperty("/photo");
            if (!sPhoto) {
                sap.m.MessageToast.show("No Profile Photo Available");
                return;
            }
            if (!this._oPreviewDialog) {
                this._oPreviewDialog = new sap.m.Dialog({
                    title: "Profile Photo",
                    contentWidth: "300px",
                    contentHeight: "300px",
                    verticalScrolling: true,
                    content: new sap.m.Image({
                        id: "previewProfileImage",
                        width: "300px",
                        height: "300px",
                        src: ""
                    }),
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: () => this._oPreviewDialog.close()
                    })
                });
                this.getView().addDependent(this._oPreviewDialog);
            }
            sap.ui.getCore().byId("previewProfileImage").setSrc(sPhoto);
            this._oPreviewDialog.open();
        },
        onCancelPress: function () {
            this.resetAllBookingData()
            var oRouter = this.getOwnerComponent().getRouter()
            oRouter.navTo("RouteHostel")
        },
        onFormEdit: async function () {
            var oSaveModel = this.getView().getModel("saveModel");
            var oedit = oSaveModel.getProperty("/isEditMode");
            var oEdit = this._oProfileDialog.getModel("profileData").getData();
            if (!oedit) {
                oSaveModel.setProperty("/isEditMode", true);
                return;
            }
            var oPayload = {
                UserName: oEdit.name
            }

            const oId = this._oLoggedInUser || {};
            const ID = oId.UserID || "";
            const filter = {
                UserID: ID
            };
            try {
                await this.ajaxUpdateWithJQuery("HM_Login", {
                    data: oPayload,
                    filters: filter
                });
                sap.m.MessageToast.show("Data Saved Successfully ");
                oSaveModel.setProperty("/isEditMode", false);
            } catch (error) {
                sap.m.MessageToast.show("Failed");
            }
        },

        onEditSaveProfile: async function () {
            const oModel = this._oProfileDialog.getModel("profileData");
            var data = oModel.getData()
            const isEditMode = oModel.getProperty("/isEditMode");
            if (!isEditMode) {
                oModel.setProperty("/isEditMode", true);
                oModel.setProperty("/isEditMode", true);
                oModel.setProperty("/Country", data.Country);
                this._applyCountryStateCityFilters();
                // this._oProfileDialog.close();
                sap.ui.core.BusyIndicator.show(0);

                sap.ui.core.BusyIndicator.hide();
                // this._oProfileEditDialog.open();
                return;
            }
            const isMandatoryValid = (
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_Name"), "ID") &&
                utils._LCvalidateDate(sap.ui.getCore().byId("id_dob"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_gender"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_mail"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_country"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_state"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_city"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_phone"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_address"), "ID")
            );

            if (!isMandatoryValid) {
                sap.m.MessageToast.show("Please Fill all Mandatory Fields.");
                return;
            }
            const payload = {
                data: {
                    UserName: oModel.getProperty("/name"),
                    Salutation: oModel.getProperty("/Salutation"),
                    MobileNo: oModel.getProperty("/phone"),
                    EmailID: oModel.getProperty("/email"),
                    DateOfBirth: oModel.getData().DateOfBirth ? oModel.getData().DateOfBirth.split("/").reverse().join("-") : "",
                    Gender: oModel.getProperty("/gender"),
                    Address: oModel.getProperty("/address"),
                    City: oModel.getProperty("/City"),
                    State: oModel.getProperty("/State"),
                    Country: oModel.getProperty("/Country"),
                    STDCode: oModel.getProperty("/STDCode")
                },
                filters: { UserID: oModel.getProperty("/UserID") }
            };

            try {
                sap.ui.core.BusyIndicator.show(0);

                await this.ajaxUpdateWithJQuery("HM_Login", payload);
                Object.assign(this._oLoggedInUser, payload.data);
                sap.m.MessageToast.show("Profile Updated Successfully!");

            } catch (err) {
                console.error(err);
                sap.m.MessageToast.show("Error Updating Profile");
            } finally {
                sap.ui.core.BusyIndicator.hide();
                oModel.setProperty("/isEditMode", false);
                // this._oProfileEditDialog.close();
                // this._oProfileDialog.open();
            }
        },

        onPressBookingRow: function (oEvent) {

            var oContext = oEvent.getSource().getBindingContext("profileData");
            var oBookingData = oContext.getObject();

            // Status check (optional)
            var sStatus = (oBookingData.status || "").trim().toLowerCase();
            if (sStatus !== "new") {
                sap.m.MessageToast.show("Only Bookings with Status 'New' can be Edited.");
                return;
            }

            // Now reuse your logic exactly as in onEditBooking
            var oProfileModel = this._oProfileDialog.getModel("profileData");
            var aCustomers = oProfileModel.getProperty("/aCustomers");
            var aFacilities = oProfileModel.getProperty("/facility");

            var sCustomerID = oBookingData.customerID || oBookingData.CustomerID || "";

            if (!sCustomerID) {
                sap.m.MessageToast.show("Customer ID not found for this Booking.");
                return;
            }

            var oCustomer = aCustomers.find(cust => cust.customerID === sCustomerID);
            if (!oCustomer) {
                sap.m.MessageToast.show("No Customer Details Found for this Booking.");
                return;
            }
            var aCustomerFacilities = aFacilities.filter(fac => fac.customerid === sCustomerID);
            // Calculate totals
            var oTotals = this.calculateTotals(
                [{ FullName: oCustomer.customerName, Facilities: { SelectedFacilities: aCustomerFacilities } }],
                oBookingData.Startdate,
                oBookingData.EndDate,
                oBookingData.RoomPrice
            );
            if (!oTotals) {
                return;
            }

            // Prepare data for details view
            var oFullCustomerData = {
                salutation: oCustomer.salutation,
                FullName: oCustomer.customerName,
                Gender: oCustomer.gender,
                stdcode: oCustomer.stdCode,
                MobileNo: oCustomer.mobileno,
                CustomerEmail: oCustomer.customerEmail,
                Country: oCustomer.country,
                State: oCustomer.state,
                City: oCustomer.city,
                DateOfBirth: oCustomer.DOB,
                RoomType: oBookingData.room,
                Price: oBookingData.amount,
                noofperson: oBookingData.noofperson,
                RoomPrice: oBookingData.RoomPrice,
                PaymentType: oBookingData.paymenytype,
                StartDate: oBookingData.Startdate,
                EndDate: oBookingData.EndDate || "",
                CustomerId: oBookingData.cutomerid,
                TotalDays: oTotals.TotalDays,
                AllSelectedFacilities: oTotals.AllSelectedFacilities,
                TotalFacilityPrice: oTotals.TotalFacilityPrice,
                GrandTotal: oTotals.GrandTotal
            };

            // Set model for next screen
            var oHostelModel = new JSONModel(oFullCustomerData);
            this.getOwnerComponent().setModel(oHostelModel, "HostelModel");

            // Navigate
            this.getOwnerComponent().getRouter().navTo("RouteAdminDetails", {
                sPath: encodeURIComponent(sCustomerID)
            });
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

            console.log("✔ All booking data fully reset!");
        },
        onEditBooking: function () {

            var oTable = sap.ui.getCore().byId("IdProfileaTable");
            var oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please Select a Booking to Edit.");
                return;
            }

            // Get selected booking record
            var oContext = oSelectedItem.getBindingContext("profileData");
            var oBookingData = oContext.getObject();

            // -------------------------------
            // 1️⃣ STATUS VALIDATION (STOP HERE)
            // -------------------------------
            var sStatus = (oBookingData.status || "").trim().toLowerCase();

            if (sStatus !== "new") {
                sap.m.MessageToast.show("Only Bookings with Status 'New' can be Edited.");
                return;  // ❗ STOP — DO NOT NAVIGATE
            }
            // -------------------------------

            // Retrieve models
            var oProfileModel = this._oProfileDialog.getModel("profileData");
            var aCustomers = oProfileModel.getProperty("/aCustomers");
            var aFacilities = oProfileModel.getProperty("/facility");

            // Customer ID
            var sCustomerID = oBookingData.cutomerid || oBookingData.CustomerID || "";

            if (!sCustomerID) {
                sap.m.MessageToast.show("Customer ID not found for this Booking.");
                return;
            }

            // Find customer
            var oCustomer = aCustomers.find(cust => cust.customerID === sCustomerID);
            if (!oCustomer) {
                sap.m.MessageToast.show("No Customer Details found for this Booking.");
                return;
            }

            // Customer facilities
            var aCustomerFacilities = aFacilities.filter(fac => fac.customerid === sCustomerID);

            // Calculate totals
            var oTotals = this.calculateTotals(
                [{ FullName: oCustomer.customerName, Facilities: { SelectedFacilities: aCustomerFacilities } }],
                oBookingData.Startdate,
                oBookingData.EndDate,
                oBookingData.RoomPrice
            );

            if (!oTotals) {
                return; // Invalid dates — do not navigate
            }

            // Prepare data for edit page
            var oFullCustomerData = {
                salutation: oCustomer.salutation,
                FullName: oCustomer.customerName,
                Gender: oCustomer.gender,
                stdcode: oCustomer.stdCode,
                MobileNo: oCustomer.mobileno,
                CustomerEmail: oCustomer.customerEmail,
                Country: oCustomer.country,
                State: oCustomer.state,
                City: oCustomer.city,
                DateOfBirth: oCustomer.DOB,
                RoomType: oBookingData.room,
                Price: oBookingData.amount,
                noofperson: oBookingData.noofperson,
                RoomPrice: oBookingData.RoomPrice,
                PaymentType: oBookingData.paymenytype,
                StartDate: oBookingData.Startdate,
                EndDate: oBookingData.EndDate || "",
                CustomerId: oBookingData.cutomerid,
                TotalDays: oTotals.TotalDays,
                AllSelectedFacilities: oTotals.AllSelectedFacilities,
                TotalFacilityPrice: oTotals.TotalFacilityPrice,
                GrandTotal: oTotals.GrandTotal,
                HasFacilities: oTotals.AllSelectedFacilities.length > 0
            };
            // oFullCustomerData.HasFacilities = oTotals.AllSelectedFacilities.length > 0;


            // Set model & Navigate
            var oHostelModel = new JSONModel(oFullCustomerData);
            this.getOwnerComponent().setModel(oHostelModel, "HostelModel");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("EditBookingDetails");
        }
        ,
        SectionPress: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            if (!oSelectedItem) return;

            var oContext = oSelectedItem.getBindingContext("profileMenuModel");
            var oSectionData = oContext ? oContext.getObject() : null;

            if (oSectionData) {
                if (oSectionData.key === "logout") {
                    var oView = this.getView();
                    if (oView.byId("loginButton")) oView.byId("loginButton").setVisible(true);
                    if (oView.byId("ProfileAvatar")) oView.byId("ProfileAvatar").setVisible(false);
                    if (this._oProfileDialog) this._oProfileDialog.close();
                } else {
                    // Update the dialog's section model, not the view’s
                    if (this._oProfileDialog) {
                        var oSectionModel = this._oProfileDialog.getModel("profileSectionModel");
                        if (oSectionModel) {
                            oSectionModel.setProperty("/selectedSection", oSectionData.key);
                        }
                    }
                }
            }
        },
        onPressEditSave: async function (oEvent) {
            var oButton = oEvent.getSource();
            var oViewModel = this.getView().getModel("viewModel");
            var bEditMode = oViewModel.getProperty("/editMode");
            var oHostelModel = this.getView().getModel("HostelModel");
            var oData = oHostelModel.getData();

            if (!bEditMode) {
                // Before entering edit mode, ensure bed types are loaded
                await this.BedTypedetails();

                // Switch to edit mode
                oViewModel.setProperty("/editMode", true);
                oButton.setText("Save");
            } else {

                oViewModel.setProperty("/editMode", false);
                oButton.setText("Edit");

                try {
                    //  Build Booking data
                    const bookingData = [{
                        BookingDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                        RentPrice: oData.GrandTotal ? oData.GrandTotal.toString() : "0",
                        RoomPrice: oData.RoomPrice || "0",
                        NoOfPersons: oData.noofperson || 1,
                        Customerid: oData.CustomerId,
                        StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                        EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                        Status: "Updated",
                        PaymentType: oData.PaymentType || "",
                        BedType: oData.BedType || ""
                    }];

                    //  Build Facility data
                    const facilityData = [];
                    if (oData.AllSelectedFacilities && oData.AllSelectedFacilities.length > 0) {
                        oData.AllSelectedFacilities.forEach(fac => {
                            facilityData.push({
                                PaymentID: "",
                                FacilityName: fac.FacilityName,
                                FacilitiPrice: fac.Price,
                                StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                                EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                                PaidStatus: "Pending"
                            });
                        });
                    }

                    //  Build Payment data (optional)
                    // const paymentDetails = {
                    //     BankName: sap.ui.getCore().byId("idBankName")?.getValue() || "",
                    //     Amount: sap.ui.getCore().byId("idAmount")?.getValue() || oData.GrandTotal,
                    //     PaymentType: oData.PaymentType || "",
                    //     BankTransactionID: sap.ui.getCore().byId("idTransactionID")?.getValue() || "",
                    //     Date: sap.ui.getCore().byId("idPaymentDate")?.getValue() || "",
                    //     Currency: sap.ui.getCore().byId("idCurrency")?.getValue() || "INR"
                    // };

                    //  Build Personal Information
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
                        Booking: bookingData,
                        FacilityItems: facilityData,
                        //  PaymentDetails: [paymentDetails]
                    }];

                    //  Final payload structure
                    const oPayload = personData;
                    var custid = bookingData[0].Customerid
                    // --- AJAX CALL (Update to backend) ---
                    await this.ajaxUpdateWithJQuery("HM_Customer", {
                        data: oPayload,
                        filters: {
                            CustomerID: custid
                        }
                    });
                    sap.m.MessageToast.show("Booking Details Updated Successfully!");

                } catch (err) {
                    console.error("Error during update:", err);
                    sap.m.MessageBox.error("Failed to Update Booking Details: " + err.message);
                }
            }
        },

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

                sap.m.MessageToast.show("Room Type changed to " + oSelectedBedType.BedTypeName);
            }
        },
        onProfileDialogClose: function () {
            this._oProfileDialog.close()
        },
        onProfileclose: function () {
            // Close the dialog and perform logout logic
            if (this._oProfileDialog) this._oProfileDialog.close();
        },
        onCancelPress: function () {
             this._isPersonUIInitialized = false;
        this._mustRecreatePersonUI = true;
        this._lastPersonCount = null;
        this._iSelectedStepIndex = 0;
        this._oSelectedStep = null;
            this.resetAllBookingData()
            var oRouter = this.getOwnerComponent().getRouter()
            oRouter.navTo("RouteHostel")
        },
        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter()
            oRouter.navTo("RouteHostel")
        },
        onTableSelect: async function (oEvent) {
            const sKey = oEvent.getParameter("key");
            const oModel = this._oProfileDialog.getModel("profileData");
            oModel.setProperty("/selectedTab", sKey);
        },
        onPressManageInvoice: function (oEvent) {
            this.getOwnerComponent().getRouter().navTo("RouteManageInvoiceDetails", { sPath: encodeURIComponent(oEvent.getSource().getBindingContext("profileData").getObject().InvNo), dash: "ManageInvoice" });
        },


    });
});