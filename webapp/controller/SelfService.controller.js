sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel", "sap/m/MessageToast",
],
    function (BaseController, utils, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.SelfService", {
            onInit: function () {
                this.getRouter().getRoute("RouteSelfService").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.EmployeeID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeID");
                this._fetchCommonData("Designation", "sDesignationModel");
                this._fetchCommonData("BaseLocation", "sBaseLocationModel");
                this._fetchCommonData("EmployeeDetails", "sEmployeeModel", {
                    EmployeeID: this.EmployeeID});    
                this._fetchCommonData("EducationalDetails", "sEducationModel", {
                    EmployeeID: this.EmployeeID});    
                this._fetchCommonData("EmploymentDetails", "sEmploymentModel", {
                    EmployeeID: this.EmployeeID});    
                var oViewModel = new JSONModel({ isEditMode: false, Max: new Date() });
                this.getView().setModel(oViewModel, "viewModel");
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle()
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "My Details");
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            SS_commonOpenDialog: function (dialogProperty, fragmentName, datePickerIds = []) {
                if (!this[dialogProperty]) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(oDialog => {
                        this[dialogProperty] = oDialog;
                        this.getView().addDependent(oDialog);
                        this._FragmentDatePickersReadOnly(datePickerIds);
                        oDialog.open();
                    });
                } else {
                    this._FragmentDatePickersReadOnly(datePickerIds);
                    this[dialogProperty].open();
                }
            },

            //Education dialog open
            EdF_AddEdu: function () {
                this.SS_commonOpenDialog("SEd_oDialog", "sap.kt.com.minihrsolution.fragment.AddEducation", ["AddEd_id_StartEdu", "AddEd_id_EndEdu"]);
            },
            onStartDateChange: function (oEvent) {
                let oStartDate = oEvent.getSource().getDateValue();
                let oEndDatePicker = sap.ui.getCore().byId("AddEd_id_EndEdu");

                if (oEndDatePicker) {
                    let oEndDate = oEndDatePicker.getDateValue();
                    oEndDatePicker.setMinDate(oStartDate);
                    if (oEndDate && oEndDate < oStartDate) {
                        oEndDatePicker.setDateValue(null);
                    }
                }
            },

            //Education dialog close
            AddEd_onCloseDial: function () {
                this.SEd_oDialog.close();
            },

            //Employment dialog open
            EmpF_onAddEmp: function () {
                this.SS_commonOpenDialog("SEmp_oDialog", "sap.kt.com.minihrsolution.fragment.AddEmployment", ["AddEmp_id_StartDate", "AddEmp_id_EndDate"]);
            },
            //Employment dialog close
            AddEmp_onClose: function () {
                this.SEmp_oDialog.close();
            },
            SS_validateMobileNo: function (oEvent) {
                utils._LCvalidateMobileNumber(oEvent);
            },
            SS_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
            },
            SS_validateVoterId: function (oEvent) {
                utils._LCvalidateVoterId(oEvent);
            },
            SS_validateAadharCard: function (oEvent) {
                utils._LCvalidateAadharCard(oEvent);
            },
            SS_validatePassport: function (oEvent) {
                utils._LCvalidatePassport(oEvent);
            },
            SS_validatePanCard: function (oEvent) {
                utils._LCvalidatePanCard(oEvent);
            },
            SS_validateAccountNo: function (oEvent) {
                utils._LCvalidateAccountNo(oEvent);
            },
            SS_validateIfcCode: function (oEvent) {
                utils._LCvalidateIfcCode(oEvent);
            },
            SS_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            SS_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            SS_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            SS_onEditPress: function () {
                var isEditMode = this.getView().getModel("viewModel").getProperty("/isEditMode");
                if (isEditMode) {
                    if (this.SS_onSavePress()) {  // Call Save function and check validation
                        this.getView().getModel("viewModel").setProperty("/isEditMode", false);
                    }
                } else {
                    this.getView().getModel("viewModel").setProperty("/isEditMode", true);
                }
            },
            SS_onSavePress: function () {
                try {
                    if (utils._LCvalidateDate(this.byId("SS_id_Dob"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_PAddress"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_CAdress"), "ID") && utils._LCvalidateMobileNumber(this.byId("SS_id_MobileNo"), "ID") && utils._LCvalidateName(this.byId("SS_id_AcName"), "ID") && utils._LCvalidateAccountNo(this.byId("SS_id_Acno"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("SS_id_BankName"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_Branch"), "ID") && utils._LCvalidateIfcCode(this.byId("SS_id_IfcsCode"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_Address"), "ID") && utils._LCvalidatePanCard(this.byId("SS_id_Pan"), "ID") && utils._LCvalidateAadharCard(this.byId("SS_idAdhar"), "ID") && utils._LCvalidatePassport(this.byId("SS_id_Passport"), "ID") &&
                        utils._LCvalidateVoterId(this.byId("SS_id_Voterid"), "ID") && utils._LCvalidateName(this.byId("SS_id_EmeNameF"), "ID") && utils._LCvalidateMobileNumber(this.byId("SS_id_EmpMoF"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_AddF"), "ID") && utils._LCvalidateName(this.byId("SS_id_NameS"), "ID") && utils._LCvalidateMobileNumber(this.byId("SS_id_EmpMoS"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_EmpAddS"), "ID")) {
                        sap.ui.core.BusyIndicator.show(0);
                        var oDataModel = this.getView().getModel("sEmployeeModel").getData()[0];
                        oDataModel.EmergencyContactPerson1Salutation = this.getView().byId("SS_idEmeSalF").getSelectedKey();
                        oDataModel.EmergencyContactPerson2Salutation = this.getView().byId("SS_idEmeSalS").getSelectedKey();
                        oDataModel.EmergencyContactPerson1Realtion = this.getView().byId("SS_idRelF").getSelectedKey();
                        oDataModel.EmergencyContactPerson2Realtion = this.getView().byId("SS_idRelS").getSelectedKey();
                        var oPayload = {
                            data: oDataModel,
                            filters: {
                                EmployeeID: this.EmployeeID
                            }
                        };
                        this.ajaxUpdateWithJQuery("EmployeeDetails", oPayload).then((oData) => {
                            sap.ui.core.BusyIndicator.hide();
                            if (oData.success) {
                                MessageToast.show(this.i18nModel.getText("dataSaved"));
                                this.getView().getModel("viewModel").setProperty("/isEditMode", false);
                            } else {
                                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                            }
                        }).catch((oError) => {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        });
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (err) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },
            AddEd_onSubmitEdDetails: function () {
                try {
                    if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEd_id_College"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("AddEd_id_StartEdu"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("AddEd_id_EndEdu"), "ID") && this._LCvalidateGrade(sap.ui.getCore().byId("AddEd_id_Grade"), "ID")) {
                        var oModel = this.getView().getModel("oTraineeDetails").getData();
                        var oPayload = {
                            tableName: "EducationalDetails",
                            data: oModel
                        };
                        this.ajaxCreateWithJQuery("EducationalDetails", oPayload).then((oData) => {
                            sap.ui.core.BusyIndicator.hide();
                            if (oData.success) {
                                MessageToast.show(this.i18nModel.getText("eduDataSaved"));
                            } else {
                                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                            }
                        }).catch((error) => {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        });
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },

            AddEmp_onSubmitEmp: function () {
                try {
                    if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEmp_id_Company"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEmp_id_Desig"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEmp_id_OfcAddress"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("AddEmp_id_StartDate"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("AddEmp_id_EndDate"), "ID") && utils._LCvalidateName(sap.ui.getCore().byId("AdEmp_id_RCNameI"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AdEmp_id_RCAddressI"), "ID") && utils._LCvalidateEmail(sap.ui.getCore().byId("AdEmp_id_RCMailI"), "ID") &&
                        utils._LCvalidateMobileNumber(sap.ui.getCore().byId("AdEmp_id_RCMobileI"), "ID") && utils._LCvalidateName(sap.ui.getCore().byId("AdEmp_id_RCNameII"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AdEmp_id_RCAddressII"), "ID") && utils._LCvalidateEmail(sap.ui.getCore().byId("AdEmp_id_RCMailII"), "ID") && utils._LCvalidateMobileNumber(sap.ui.getCore().byId("AdEmp_id_RCMobileII"), "ID")) {
                        var oModel = this.getView().getModel("oTraineeDetails").getData();
                        var oPayload = {
                            tableName: "EmploymentDetails",
                            data: oModel
                        };
                        this.ajaxCreateWithJQuery("EmploymentDetails", oPayload).then((oData) => {
                            sap.ui.core.BusyIndicator.hide();
                            if (oData.success) {
                                MessageToast.show(this.i18nModel.getText("empDataSaved"));
                            } else {
                                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                            }
                        }).catch((error) => {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));

                        });
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },

            SS_onTabSelect: async function (oEvent) {
                if (oEvent.getParameter("key") === "educationDetailKey") {
                    this.getView().getModel("viewModel").setProperty("/isEditButtonVisible", false);
                } else if (oEvent.getParameter("key") === "employmentKey") {
                    this.getView().getModel("viewModel").setProperty("/isEditButtonVisible", false);
                } else if (oEvent.getParameter("key") === "salaryKey") {
                    this.getView().getModel("viewModel").setProperty("/isEditButtonVisible", false);
                } else if (oEvent.getParameter("key") === "paySlipKey") {
                    this.getView().getModel("viewModel").setProperty("/isEditButtonVisible", false);
                }
                else {
                    this.getView().getModel("viewModel").setProperty("/isEditButtonVisible", true);
                }
            },
            _LCvalidateGrade: function (oEvent, type) {
                var oField = (type === "ID") ? oEvent : oEvent.getSource();
                if (!oField) return false;

                var sGradeValue = oField.getValue().trim();

                // Allow only numeric input (restrict typing letters)
                var cleanValue = sGradeValue.replace(/[^0-9.]/g, ''); // Remove all non-numeric characters except the period
                oField.setValue(cleanValue); // Update the field with the cleaned value

                // Allow only numbers with up to two decimal places
                var regex = /^\d{1,5}(\.\d{1,2})?$/;
                if (!regex.test(cleanValue) || isNaN(cleanValue)) {
                    oField.setValueState("Error");
                    oField.setValueStateText("Please enter a valid numeric value with up to two decimal places.");
                    return false;
                }

                var fGrade = parseFloat(cleanValue);
                var sGradeType = sap.ui.getCore().byId("AddEd_id_GradeType").getSelectedKey();

                var bIsValid = false;
                if (sGradeType === "Percentage") {
                    bIsValid = fGrade > 0 && fGrade <= 100;
                } else if (sGradeType === "CGPA") {
                    bIsValid = fGrade > 0 && fGrade <= 10;
                }

                if (bIsValid) {
                    oField.setValueState("None");
                    return true;
                } else {
                    oField.setValueState("Error");
                    var sErrorMsg = (sGradeType === "Percentage")
                        ? "Grade must be between 0 and 100 for Percentage."
                        : "Grade must be between 0 and 10 for CGPA.";
                    oField.setValueStateText(sErrorMsg);
                    return false;
                }
            }


        });
    });