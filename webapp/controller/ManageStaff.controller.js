sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../model/formatter",
], function(BaseController, utils, MessageBox, MessageToast, Formatter) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.ManageStaff", {
        Formatter: Formatter,
        onInit: function() {
            var today = new Date();
            // var maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
            var oDateModel = new sap.ui.model.json.JSONModel();
                oDateModel.setData({
                    // maxDate: maxDate,
                    focusedDate: new Date(2000, 0, 1),
                    minDate: new Date(1950, 0, 1),
                });
            this.getView().setModel(oDateModel, "controller");
            this.getOwnerComponent().getRouter().getRoute("RouteManageStaff").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function() {
            try {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._initEmptyMDModel();
                this.onClearAndSearch("MS_id_FilterbarEmployee");
                this.commonLoginFunction();
                await this._loadBranchCode();
                await this.Onsearch("true");
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _initEmptyMDModel: function() {
            const emptyData = {
                Salutation: "",
                UserName: "",
                Role: "",
                BranchCode: [],
                Email: "",
                MobileNo: "",
                password: "",
                comfirmpass: "",
                STDCode: "",
                Address: "",
                Country: "",
                State: "",
                City: "",
                Gender: "",
                DateOfBirth: ""
            };
            const oModel = new sap.ui.model.json.JSONModel(emptyData);
            this.getView().setModel(oModel, "MDmodel");
        },

         _loadBranchCode: async function() {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            let aBranchCodes = [];

            if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode.split(",").map(code => code.trim());
            }

            let filters = {};
            if (oExistingModel.Role !== "") {
                filters = {
                    BranchID: aBranchCodes
                };
            }

            sap.ui.core.BusyIndicator.show(0);
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                this.getView().setModel(oBranchModel, "BranchModel");
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            }
        },

        HM_AddHostelFeature: function() {
            const oView = this.getView();
            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.ManageStaff",
                    this
                );
                oView.addDependent(this.ARD_Dialog);
            }

            this._initEmptyMDModel();   // RESET MODEL
            this._clearManualFields();  // CLEAR UI FIELDS
            this._resetValueStates();
            this.ARD_Dialog.open();
        },

        HM_EditHostelFeature: function() {
            const oTable = this.byId("MS_id_ManageStaff");
            const oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                return MessageToast.show(this.i18nModel.getText("MSediterr"));
            }

            const oData = oSelected.getBindingContext("mainModel").getObject();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "sap.ui.com.project1.fragment.ManageStaff",
                    this
                );
                this.getView().addDependent(this.ARD_Dialog);
            }

            const staffData = {
                UserID: oData.UserID || "",
                Salutation: oData.Salutation || "",
                UserName: oData.UserName || "",
                Email: oData.EmailID || "",
                MobileNo: oData.MobileNo || "",
                STDCode: oData.STDCode || "",
                Address: oData.Address || "",
                Country: oData.Country || "",
                State: oData.State || "",
                City: oData.City || "",
                Gender: oData.Gender || "",
                DateOfBirth: this.Formatter.DateFormat(oData.DateOfBirth) || "",
                Role: oData.Role || "",
                BranchCode: oData.BranchCode ? oData.BranchCode.split(",") : [],
                password: "",
                comfirmpass: ""
            };

            this.getView().setModel(new sap.ui.model.json.JSONModel(staffData), "MDmodel");
            this._clearManualFields();
            this._resetValueStates();
            this.ARD_Dialog.open();
        },

        _clearManualFields: function() {
            [
                "MS_id_signUpPassword",
                "MS_id_signUpConfirmPassword"
            ].forEach(id => {
                const f = this.byId(id);
                if (f) f.setValue("");
            });
        },

        _resetValueStates: function() {
            const ids = [
                "MS_id_signUpSalutation",
                "MS_id_signUpName",
                "MS_id_signUpDOB",
                "MS_id_signUpGender",
                "MS_id_signUpEmail",
                "MS_id_Branchcode",
                "MS_id_Role",
                "MS_id_signUpCountry",
                "MS_id_signUpState",
                "MS_id_signUpCity",
                "MS_id_signUpSTD",
                "MS_id_signUpPhone",
                "MS_id_signUpAddress",
                "MS_id_signUpPassword",
                "MS_id_signUpConfirmPassword"
            ];

            ids.forEach(id => {
                const c = this.byId(id);
                if (c) c.setValueState("None");
            });

            let pwdT = this.byId("MS_id_passwordStrengthText");
            if (pwdT) pwdT.setText("");

            let confirmPwd = this.byId("MS_id_signUpConfirmPassword");
            if (confirmPwd) confirmPwd.setValueState("None");
        },

        FD_onCancelButtonPress: function() {
            this._initEmptyMDModel();
            this._clearManualFields();
            this._resetValueStates();
            this.byId("MS_id_ManageStaff").removeSelections();
            if (this.ARD_Dialog) this.ARD_Dialog.close();
        },

        onSignUp: async function() {
            const C = this.byId.bind(this);
            const oModel = this.getView().getModel("MDmodel");
            const data = oModel.getData();
            const std = (C("MS_id_signUpSTD").getValue() || "").trim();

            const isValid = (
                utils._LCstrictValidationSelect(C("MS_id_signUpSalutation")) &&
                utils._LCvalidateName(C("MS_id_signUpName"), "ID") &&
                utils._LCvalidateDate(this.byId("MS_id_signUpDOB"), "ID") &&
                utils._LCstrictValidationSelect(C("MS_id_signUpGender")) &&
                utils._LCvalidateEmail(C("MS_id_signUpEmail"), "ID") &&
                utils._LCstrictValidationMultiComboBox(C("MS_id_Branchcode"),"ID") &&
                utils._LCvalidateMandatoryField(C("MS_id_Role"), "ID") &&
                utils._LCvalidateMandatoryField(C("MS_id_signUpCountry"), "ID") &&
                utils._LCvalidateMandatoryField(C("MS_id_signUpState"), "ID") &&
                utils._LCvalidateMandatoryField(C("MS_id_signUpCity"), "ID") &&
                utils._LCvalidateMandatoryField(C("MS_id_signUpSTD"), "ID") &&
                utils._LCvalidateISDmobile(C("MS_id_signUpPhone"), std) &&
                utils._LCvalidateAddress(C("MS_id_signUpAddress")) &&
                utils._LCvalidatePassword(C("MS_id_signUpPassword"),
                this.byId("MS_id_passwordStrengthText")) &&
                this.FSM_onConfirm({
                    getSource: () => C("MS_id_signUpConfirmPassword")
                })
            );

            if (!isValid) {
                return MessageToast.show(this.i18nModel.getText("MSfillallfields"));
            }

            const TimeDate = new Date().toISOString().replace("T", " ").slice(0, 19);
            const aBranchCodes = C("MS_id_Branchcode").getSelectedKeys();

            const payload = {
                Salutation: C("MS_id_signUpSalutation").getSelectedKey(),
                UserName: data.UserName.trim(),
                Role: C("MS_id_Role").getSelectedKey() || C("MS_id_Role").getValue(),
                BranchCode: aBranchCodes.join(","), 
                EmailID: data.Email.trim(),
                Password: btoa(data.password),
                STDCode: data.STDCode || std,
                MobileNo: data.MobileNo,
                Status: "Active",
                TimeDate,
                DateOfBirth: data.DateOfBirth.split('/').reverse().join('-') || "",
                Gender: C("MS_id_signUpGender").getSelectedKey(),
                Country: data.Country,
                State: data.State,
                City: data.City,
                Address: data.Address.trim(),
                Type: this.getOwnerComponent().getModel("LoginModel").getData().EmployeeID
            };

            const isUpdate = !!data.UserID;

            sap.ui.core.BusyIndicator.show(0);
            try {
                if (isUpdate) {
                    await this.ajaxUpdateWithJQuery("HM_Login", {
                        data: {
                            UserID: data.UserID,
                            ...payload
                        },
                        filters: {
                            UserID: data.UserID
                        }
                    });
                    MessageToast.show(this.i18nModel.getText("MSstaffeditsuccess"));
                } else {
                    await this.ajaxCreateWithJQuery("HM_Login", {
                        data: payload
                    });
                    MessageToast.show(this.i18nModel.getText("MSstaffaddsuccess"));
                }

                this.FD_onCancelButtonPress();
                await this.Onsearch("true");
             } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        Onsearch: function(flag) {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            var oView = this.getView();

            // Read FilterBar inputs
            var sUserID = oView.byId("MS_id_UserID").getSelectedKey() ||
                oView.byId("MS_id_UserID").getValue();

            var sUserName = oView.byId("MS_id_UserName").getSelectedKey() ||
                oView.byId("MS_id_UserName").getValue();

            // Branch Codes (from login)
            let aBranchCodes = [];
            if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode.split(",").map(code => code.trim());
            }

            // Build Filters for backend
            let filters = {};

            // Always apply Vendor type
            filters.Type = oExistingModel.EmployeeID;

            // BranchCode applied based on role
            if (oExistingModel.Role !== "") {
                filters.BranchCode = aBranchCodes;
            }

            // Apply UserID filter
            if (sUserID) {
                filters.UserID = sUserID;
            }

            // Apply UserName filter
            if (sUserName) {
                filters.UserName = sUserName;
            }

            sap.ui.core.BusyIndicator.show(0);
            return this.ajaxReadWithJQuery("HM_StaffContact", filters).then((oData) => {
                    const response = Array.isArray(oData.data) ? oData.data : [oData.data];

                    if (!this._originalStaffData || flag === "true") {
                        this._originalStaffData = response;
                    }

                    let finalData;
                    if (Object.keys(filters).length === 1 && filters.Type === "Vendor") {
                        finalData = this._originalStaffData;
                    } else {
                        finalData = response;
                    }

                    const model = new sap.ui.model.json.JSONModel(finalData);
                    this.getView().setModel(model, "mainModel");

                    this._populateUniqueFilterValues(this._originalStaffData);
                }).catch((err) => {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show(err.message || err.responseText);
                }).finally(() => {
                    sap.ui.core.BusyIndicator.hide();
                });
        },

        _populateUniqueFilterValues: function(data) {
            let uniqueValues = {
                MS_id_UserID: new Set(),
                MS_id_UserName: new Set()
            };

            data.forEach(item => {
                if (item.UserID) uniqueValues.MS_id_UserID.add(item.UserID);
                if (item.UserName) uniqueValues.MS_id_UserName.add(item.UserName);
            });

            let oView = this.getView();

            ["MS_id_UserID", "MS_id_UserName"].forEach(field => {
                let oComboBox = oView.byId(field);
                if (!oComboBox) return;

                oComboBox.destroyItems();

                Array.from(uniqueValues[field]).sort().forEach(value => {
                    oComboBox.addItem(new sap.ui.core.Item({
                        key: value,
                        text: value
                    }));
                });
            });
        },

        HM_DeleteHostelFeature: async function() {
            var oTable = this.byId("MS_id_ManageStaff");
            var oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                MessageToast.show(this.i18nModel.getText("MSdeleteerr"));
                return;
            }

            var that = this;
            var oData = oSelectedItem.getBindingContext("mainModel").getObject();
            var sName = oData.UserName;

            MessageBox.confirm(
                `Are you sure you want to delete the Staff record: ${sName}?`, {
                    icon: MessageBox.Icon.WARNING,
                    title: "Confirm Deletion",
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.NO,

                    onClose: async function(sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            try {
                                sap.ui.core.BusyIndicator.show(0);

                                await that.ajaxDeleteWithJQuery("HM_Login", {
                                    filters: {
                                        UserID: oData.UserID
                                    }
                                });

                                MessageToast.show(this.i18nModel.getText("MSdeletemsg"));
                                await that.Onsearch("true"); // refresh table
                            } catch (err) {
                                sap.m.MessageToast.show(err.message || err.responseText);
                            } finally {
                                sap.ui.core.BusyIndicator.hide();
                                oTable.removeSelections(true);
                            }
                        } else {
                            oTable.removeSelections(true);
                        }
                    }
                }
            );
        },

        FC_onPressClear: function() {
            this.getView().byId("MS_id_UserID").setSelectedKey("");
            this.getView().byId("MS_id_UserName").setSelectedKey("")
        },

        onNavBack: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        onHome: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },

        onbranchChange:function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationMultiComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onRoleChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onChangeSalutation: function(oEvent) {
            const oSalutation = oEvent.getSource();
            const sKey = oSalutation.getSelectedKey();

            // Gender control from the same view
            const oGender = this.byId("MS_id_signUpGender");

            if (!oGender) {
                console.error("Gender Select not found");
                return;
            }

            // Reset gender
            oGender.setSelectedKey("");
            oGender.setEnabled(true);

            // Auto-select based on salutation
            if (sKey === "Mr.") {
                oGender.setSelectedKey("Male");
                oGender.setEnabled(false);
            } else if (sKey === "Ms." || sKey === "Mrs.") {
                oGender.setSelectedKey("Female");
                oGender.setEnabled(false);
            }

            utils._LCstrictValidationSelect(oSalutation);
        },

        _LCvalidateName: function(oEvent) {
            utils._LCvalidateName(oEvent);
        },

        onChangeDOB: function(oEvent) {
            utils._LCvalidateDate(oEvent);
        },

        onChangeGender: function(oEvent) {
            utils._LCstrictValidationSelect(oEvent.getSource());
        },

        onEmailliveChange: function(oEvent) {
            utils._LCvalidateEmail(oEvent);
        },

        onChangeCountry: function(oEvent) {
            const oCountry = oEvent.getSource();
            oCountry.setValue(oCountry.getValue().replace(/[^a-zA-Z\s]/g, ""));

            utils._LCvalidateMandatoryField(oEvent);

            const oModel = this.getView().getModel("MDmodel");

            const oState = this.byId("MS_id_signUpState");
            const oCity = this.byId("MS_id_signUpCity");
            const oSTD = this.byId("MS_id_signUpSTD");

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

            //  RELEASE states only after country valid
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

        onChangeState: function(oEvent) {
            const oState = oEvent.getSource();
            const oModel = this.getView().getModel("MDmodel");

            // sanitize free typing
            oState.setValue(oState.getValue().replace(/[^a-zA-Z\s]/g, ""));

            utils._LCvalidateMandatoryField(oEvent);

            // ALWAYS WRITE TO MODEL
            const sStateText =
                oState.getSelectedItem()?.getText() ||
                oState.getValue() ||
                "";

            oModel.setProperty("/State", sStateText);

            // reset city whenever state changes
            const oCity = this.byId("MS_id_signUpCity");
            oModel.setProperty("/City", "");
            oCity.setValue("").setSelectedKey("");

            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("cityName", "EQ", "__NONE__")
            ]);

            // release cities only if country is valid
            const oCountry = this.byId("MS_id_signUpCountry");
            const sCountryCode =
                oCountry.getSelectedItem()?.getAdditionalText()?.trim();

            if (!sCountryCode || !sStateText) return;

            oCity.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", "EQ", sStateText),
                new sap.ui.model.Filter("countryCode", "EQ", sCountryCode)
            ]);
        },

        onChangeCity: function(oEvent) {
            const oCity = oEvent.getSource();
            const oModel = this.getView().getModel("MDmodel");

            // sanitize manual typing
            oCity.setValue(oCity.getValue().replace(/[^a-zA-Z\s]/g, ""));

            const oCountry = this.byId("MS_id_signUpCountry");
            const oState = this.byId("MS_id_signUpState");

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

            // ALWAYS WRITE TO MODEL
            const sCityText = oCity.getSelectedItem()?.getText() || oCity.getValue() || "";
            oModel.setProperty("/City", sCityText);
        },

        onSTDChange: function() {
            const oSTD = this.byId("MS_id_signUpSTD");
            const oMobile = this.byId("MS_id_signUpPhone");
            const std = oSTD.getValue();
            oMobile.setValue("");

            // Dynamic maxLength
            if (std === "+91") {
                oMobile.setMaxLength(10);
            } else {
                oMobile.setMaxLength(18);
            }
        },

        onMobileLivechnage: function(oEvent) {
            const oInput = oEvent.getSource();

            // Digits only
            let val = oInput.getValue().replace(/\D/g, "");
            oInput.setValue(val);

            const stdRaw = this.byId("MS_id_signUpSTD").getValue() || "";
            const std = stdRaw.replace(/\s+/g, "").startsWith("+") ?
                stdRaw.replace(/\s+/g, "") :
                "+" + stdRaw.replace(/\s+/g, "");

            //  NEW RULE:
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

            //  STRICT validation while typing
            const isValid = utils._LCvalidateISDmobile(oInput, std);

            if (!isValid) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Enter valid Mobile Number");
            } else {
                oInput.setValueState("None");
            }
        },

        onAddressChange: function() {
            utils._LCvalidateAddress(this.byId("MS_id_signUpAddress"));
        },

        SM_onChnageSetAndConfirm: function(oEvent) {
            const oInput = oEvent.getSource();
            const sId = oInput.getId();
            let oStrengthText = null;

            if (sId === "MS_id_signUpPassword") {
                oStrengthText = this.byId("MS_id_passwordStrengthText");
            } else if (sId === "newPass") {
                oStrengthText = this.byId("fpMS_id_passwordStrengthText");
            }

            utils._LCvalidatePassword(oInput, oStrengthText);
        },

        FSM_onConfirm: function(oEvent) {
            const oInput = oEvent?.getSource();
            if (!oInput) return false;

            const confirm = (oInput.getValue() || "").trim();
            const pass = this.byId("MS_id_signUpPassword").getValue().trim();

            // Required
            if (!confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Confirm Password is Required");
                return false; //  EXPLICIT FAIL
            }

            // Compare
            if (pass !== confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Passwords do not match");
                return false; //  EXPLICIT FAIL
            }

            // Success
            oInput.setValueState("None");
            return true; //  EXPLICIT PASS
        },

        SM_onTogglePasswordVisibility: function(oEvent) {
            const oInput = oEvent.getSource();
            const isPassword = oInput.getType() === "Password";
            oInput.setType(isPassword ? "Text" : "Password");
            oInput.setValueHelpIconSrc(isPassword ? "sap-icon://hide" : "sap-icon://show");
        },

        SM_onGeneratePassword: function() {
            var oPwdInput = this.byId("MS_id_signUpPassword");
            var oStrength = this.byId("MS_id_passwordStrengthText"); // signup label

            if (!oPwdInput) {
                console.error("signUpPassword input not found");
                return;
            }

            var pwd = utils._LCgenerateStrongPassword();
            oPwdInput.setValue(pwd);
            utils._LCvalidatePassword(oPwdInput, oStrength);
        },

        MS_onDownload:function() {
             const oModel = this.byId("MS_id_ManageStaff").getModel("mainModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                MobileNo: item.MobileNo ? String(item.MobileNo) : ""
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level"
                },
                dataSource: adjustedData,
                fileName: "Manage_Staff.xlsx",
                worker: false
            };
            MessageToast.show(this.i18nModel.getText("MSdownloading"));
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).finally(() => {
                oSheet.destroy();
            });
        },

        createTableSheet: function () {
            return [{
                label: "User ID",
                property: "User ID",
                type: "string"
            },
            {
                label: "Staff Name",
                property: "Staff Name",
                type: "string"
            },
            {
                label: "Role",
                property: "Role",
                type: "string"
            },
            {
                label: "Email ID",
                property: "Email ID",
                type: "string"
            },
            {
                label: "Gender",
                property: "Gender",
                type: "string"
            },
            {
                label: "Mobile Number",
                property: "Mobile Number",
                type: "string"
            },
            {
                label: "Address",
                property: "Address",
                type: "string"
            }
            ]
        },
    });
});