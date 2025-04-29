sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel", "sap/m/MessageToast", "sap/m/MessageBox", "sap/ui/core/BusyIndicator", "../model/formatter"],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, BusyIndicator, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.SelfService", {
            Formatter: Formatter,
            onInit: function () {
                var oDateModel = new sap.ui.model.json.JSONModel();
                var currentDate = new Date();
                oDateModel.setData({ maxDate: currentDate, focusedDate: new Date(2000, 0, 1) });
                this.getView().setModel(oDateModel, "controller");
                this.getRouter().getRoute("RouteSelfService").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function () {
                BusyIndicator.show(0)
                this.commonLoginFunction("EmployeeDetails");
                this.companyName = "Kalpavriksha Technologies"; // TO AVOID ONE MORE AJAX CALL (By Shivang)
                this.EmployeeID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeID");
                this.byId("SS_id_IconTab").setSelectedKey("employeeDetailsKey");
                this.SS_commonEduFunction();
                this.SS_commonEmpFunction();
                this.EduFolderID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EducationalandDocumentsDetailFolderID");
                this.EmpFolderID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmploymentDetailFolderID");
                await this._fetchCommonData("Designation", "sDesignationModel");
                await this._fetchCommonData("BaseLocation", "sBaseLocationModel");
                await this._fetchCommonData("EmployeeDetails", "sEmployeeModel", { EmployeeID: this.EmployeeID });
                this.SS_readSalaryDetails(this.EmployeeID);
                var viewModel = new JSONModel({
                    fragmentSave: false, fragmentSubmit: false, isEditMode: false, EmployeeStatus: false,
                    isRoleMode: false, Max: new Date(), isVisitMode: true, isIdMode: true, isEditButtonVisible: true
                });
                this.getView().setModel(viewModel, "viewModel");
                this.ViewModel = this.getView().getModel("viewModel");
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle()
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "My Details");
                this.setEduButtonsEnabled(false);
                this.setEmpButtonsEnabled(false);
                this.SS_CommonID();
                BusyIndicator.hide()
            },

            SS_commonEduFunction() {
                var eduModel = new JSONModel({
                    EmployeeID: this.EmployeeID,
                    CollegeName: "",
                    DegreeName: "",
                    EducationStartDate: "",
                    EducationEndDate: "",
                    Grade: "",
                    GradeType: "",
                });
                this.getView().setModel(eduModel, "educationModel");
            },
            SS_commonEmpFunction() {
                var empModel = new JSONModel({
                    EmployeeID: this.EmployeeID,
                    CompanyName: "",
                    Designation: "",
                    StartDate: "",
                    EndDate: "",
                    OfficeAddress: "",
                    RCISal: "",
                    RCIName: "",
                    RCIAddress: "",
                    RCIEmailID: "",
                    RCIMobileNo: "",
                    RCIISal: "",
                    RCIIName: "",
                    RCIIAddress: "",
                    RCIIEmailID: "",
                    RCIIMobileNo: "",
                });
                this.getView().setModel(empModel, "employmentModel");
            },
            onPressback: function (oEvent) {
                this.showConfirmationDialog(
                    this.i18nModel.getText("ConfirmActionTitle"),
                    this.i18nModel.getText("backConfirmation"),
                    function () {
                        this.getRouter().navTo("RouteTilePage");
                    }.bind(this)
                );
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
                this.CommonLogoutFunction();
            },
            SS_CommonID: function () {
                const ids = ["SS_id_BloodGroup", "SS_id_Compmail", "SS_id_PAddress", "SS_id_CAdress", "SS_id_BaseL", "SS_id_Desi", "SS_id_Manager", "SS_id_MobileNo", "SS_id_RoleEmpSele", "SS_id_StatusSelf",
                    "SS_id_AcName", "SS_id_Acno", "SS_id_BankName", "SS_id_Branch", "SS_id_IfcsCode", "SS_id_Address", "SS_id_Pan", "SS_idAdhar", "SS_id_Passport", "SS_id_Voterid", "SS_id_EmeNameF", "SS_id_EmpMoF",
                    "SS_id_AddF", "SS_id_NameS", "SS_id_EmpMoS", "SS_id_EmpAddS"]
                ids.forEach((id) => { this.byId(id).setValueState("None"); });
            },
            //Common dialog open function
            SS_commonOpenDialog: function (dialogProperty, fragmentName, datePickerIds = []) {
                BusyIndicator.show(0)
                if (!this[dialogProperty]) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(oDialog => {
                        this[dialogProperty] = oDialog;
                        this.getView().addDependent(oDialog);
                        this._FragmentDatePickersReadOnly(datePickerIds);
                        oDialog.open();
                        BusyIndicator.hide()
                    });
                } else {
                    this._FragmentDatePickersReadOnly(datePickerIds);
                    this[dialogProperty].open();
                    BusyIndicator.hide()
                }
            },

            //Education dialog open
            EdF_AddEdu: function () {
                this.ViewModel.setProperty("/fragmentSubmit", true);
                this.ViewModel.setProperty("/fragmentSave", false);
                this.SS_commonEduFunction();
                this.SS_commonOpenDialog("SEd_oDialog", "sap.kt.com.minihrsolution.fragment.AddEducation", ["AddEd_id_StartEdu", "AddEd_id_EndEdu"]);
            },
            //Date change validation function
            setMinEndDate: function (sStartDateId, sEndDateId) {
                let oStartDatePicker = sap.ui.getCore().byId(sStartDateId);
                let oEndDatePicker = sap.ui.getCore().byId(sEndDateId);
                if (oStartDatePicker && oEndDatePicker) {
                    let oStartDate = oStartDatePicker.getDateValue();
                    let oEndDate = oEndDatePicker.getDateValue();
                    oEndDatePicker.setMinDate(oStartDate);
                    if (oEndDate && oEndDate < oStartDate) {
                        oEndDatePicker.setDateValue(null);
                    }
                }
            },
            onStartDateChange: function (oEvent) {
                this.setMinEndDate("AddEd_id_StartEdu", "AddEd_id_EndEdu");
                sap.ui.getCore().byId("AddEd_id_StartEdu").setValueState("None");
            },
            oEmpStartDateChange: function () {
                this.setMinEndDate("AddEmp_id_StartDate", "AddEmp_id_EndDate");
                sap.ui.getCore().byId("AddEmp_id_StartDate").setValueState("None");
            },
            setEduButtonsEnabled: function (bEnabled) {
                this.byId("EdF_id_EduEdit").setEnabled(bEnabled);
                this.byId("EdF_id_EduDelete").setEnabled(bEnabled);
            },
            setEmpButtonsEnabled: function (bEnabled) {
                this.byId("EmpF_id_EmpEdit").setEnabled(bEnabled);
                this.byId("EmpF_id_EmpDelete").setEnabled(bEnabled);
            },

            //Education dialog close
            AddEd_onCloseDial: function () {
                this.SEd_oDialog.close();
                this.byId("EdF_id_EduTable").removeSelections(true);
                this.setEduButtonsEnabled(false);
                const ids = ["AddEd_id_College", "AddEd_id_StartEdu", "AddEd_id_EndEdu", "AddEd_id_Grade"];
                ids.forEach((id) => { sap.ui.getCore().byId(id).setValueState("None"); });
                this._fetchCommonData("EducationalDetails", "sEducationModel", { EmployeeID: this.EmployeeID });
            },
            //Employment dialog open
            EmpF_onAddEmployment: function () {
                this.ViewModel.setProperty("/fragmentSubmit", true);
                this.ViewModel.setProperty("/fragmentSave", false);
                this.SS_commonEmpFunction();
                this.SS_commonOpenDialog("SEmp_oDialog", "sap.kt.com.minihrsolution.fragment.AddEmployment", ["AddEmp_id_StartDate", "AddEmp_id_EndDate"]);
            },
            EdF_EduAttachment: function () {
                var folderUrl = `https://workplace.zoho.in/#workdrive_app/home/63sop752ea6e63ddd4a8880466f5ae509b85a/privatespace/sharedwithme/allusers/${this.EduFolderID}`;
                window.open(folderUrl, "_blank");
            },
            EdF_EmpAttachment: function () {
                var folderUrl = `https://workplace.zoho.in/#workdrive_app/home/63sop752ea6e63ddd4a8880466f5ae509b85a/privatespace/sharedwithme/allusers/${this.EmpFolderID}`;
                window.open(folderUrl, "_blank");
            },
            //Employment dialog close
            AddEmp_onClose: function () {
                this.SEmp_oDialog.close();
                this.byId("EmpF_id_EmpTable").removeSelections(true);
                this.setEmpButtonsEnabled(false);
                const ids = ["AddEmp_id_Company", "AddEmp_id_Desig", "AddEmp_id_OfcAddress", "AddEmp_id_StartDate", "AddEmp_id_EndDate", "AdEmp_id_RCNameI", "AdEmp_id_RCAddressI", "AdEmp_id_RCMailI", "AdEmp_id_RCMobileI", "AdEmp_id_RCSalII", "AdEmp_id_RCNameII", "AdEmp_id_RCAddressII", "AdEmp_id_RCMailII", "AdEmp_id_RCMobileII"];
                ids.forEach((id) => { sap.ui.getCore().byId(id).setValueState("None"); });
                this._fetchCommonData("EmploymentDetails", "sEmploymentModel", { EmployeeID: this.EmployeeID }, ["EmpF_id_EmpTable"]);
            },
            //validation function calling from base controller
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
            SS_validateGrade: function (oEvent) {
                var sGradeTypeId = "AddEd_id_GradeType";
                var oGradeField = oEvent.getSource();
                if (oGradeField && sap.ui.getCore().byId(sGradeTypeId)) {
                    utils._LCvalidateGrade(oGradeField, "ID", sGradeTypeId);
                }
            },
            SS_validateGradeType: function () {
                var oGradeField = sap.ui.getCore().byId("AddEd_id_Grade");
                if (oGradeField) {
                    utils._LCvalidateGrade(oGradeField, "ID", "AddEd_id_GradeType");
                }
            },
            //Edit buttton visibility
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
            //Basic detail update call
            SS_onSavePress: function () {
                try {
                    const oView = this.getView();
                    // Validate required fields
                    if (
                        utils._LCvalidateDate(oView.byId("SS_id_Dob"), "ID") &&
                        utils._LCvalidateMandatoryField(oView.byId("SS_id_PAddress"), "ID") &&
                        utils._LCvalidateMandatoryField(oView.byId("SS_id_CAdress"), "ID") &&
                        utils._LCvalidateMobileNumber(oView.byId("SS_id_MobileNo"), "ID") &&
                        utils._LCvalidateName(oView.byId("SS_id_AcName"), "ID") &&
                        utils._LCvalidateAccountNo(oView.byId("SS_id_Acno"), "ID") &&
                        utils._LCvalidateMandatoryField(oView.byId("SS_id_BankName"), "ID") &&
                        utils._LCvalidateMandatoryField(oView.byId("SS_id_Branch"), "ID") &&
                        utils._LCvalidateIfcCode(oView.byId("SS_id_IfcsCode"), "ID") &&
                        utils._LCvalidateMandatoryField(oView.byId("SS_id_Address"), "ID") &&
                        utils._LCvalidatePanCard(oView.byId("SS_id_Pan"), "ID") &&
                        utils._LCvalidateName(oView.byId("SS_id_EmeNameF"), "ID") &&
                        utils._LCvalidateMobileNumber(oView.byId("SS_id_EmpMoF"), "ID") &&
                        utils._LCvalidateMandatoryField(oView.byId("SS_id_AddF"), "ID") &&
                        utils._LCvalidateName(oView.byId("SS_id_NameS"), "ID") &&
                        utils._LCvalidateMobileNumber(oView.byId("SS_id_EmpMoS"), "ID") &&
                        utils._LCvalidateMandatoryField(oView.byId("SS_id_EmpAddS"), "ID")
                    ) {
                        // Optional fields validation (only if value exists)
                        const aadhar = oView.byId("SS_idAdhar").getValue().trim();
                        const passport = oView.byId("SS_id_Passport").getValue().trim();
                        const voterId = oView.byId("SS_id_Voterid").getValue().trim();
                        if (
                            (aadhar === "" || utils._LCvalidateAadharCard(oView.byId("SS_idAdhar"), "ID")) &&
                            (passport === "" || utils._LCvalidatePassport(oView.byId("SS_id_Passport"), "ID")) &&
                            (voterId === "" || utils._LCvalidateVoterId(oView.byId("SS_id_Voterid"), "ID"))
                        ) {
                            BusyIndicator.show(0);
                            var oDataModel = oView.getModel("sEmployeeModel").getData()[0];
                            oDataModel.DateOfBirth = oView.byId("SS_id_Dob").getValue()
                            oDataModel.DateOfBirth = oDataModel.DateOfBirth.split("/").reverse().join('-');
                            oDataModel.EmergencyContactPerson1Salutation = oView.byId("SS_idEmeSalF").getSelectedKey();
                            oDataModel.EmergencyContactPerson2Salutation = oView.byId("SS_idEmeSalS").getSelectedKey();
                            oDataModel.EmergencyContactPerson1Realtion = oView.byId("SS_idRelF").getSelectedKey();
                            oDataModel.EmergencyContactPerson2Realtion = oView.byId("SS_idRelS").getSelectedKey();
                            var oPayload = {
                                data: oDataModel,
                                filters: {
                                    EmployeeID: this.EmployeeID
                                }
                            };
                            this.ajaxUpdateWithJQuery("EmployeeDetails", oPayload, ["SS_id_BSimpleForm"]).then((oData) => {
                                BusyIndicator.hide();
                                if (oData.success) {
                                    MessageToast.show(this.i18nModel.getText("dataSaved"));
                                    oView.getModel("viewModel").setProperty("/isEditMode", false);
                                    this.byId("SS_idAdhar").setValueState("None");
                                    this.byId("SS_id_Passport").setValueState("None");
                                    this.byId("SS_id_Voterid").setValueState("None");
                                } else {
                                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                                }
                            }).catch((oError) => {
                                BusyIndicator.hide();
                                sap.m.MessageToast.show(error.responseText);
                            });
                        } else {
                            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        }
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (error) {
                    BusyIndicator.hide();
                    sap.m.MessageToast.show(error.responseText);
                }
            },

            EDF_onSelectionChange: function (oEvent) {
                const aSelectedIndices = oEvent.getSource().getSelectedItems();
                if (aSelectedIndices.length > 0) {
                    this.setEduButtonsEnabled(true);
                } else {
                    this.setEduButtonsEnabled(false);
                }
            },
            EDF_EditEducation: function () {
                var oSelectedItem = this.byId("EdF_id_EduTable").getSelectedItem();
                if (oSelectedItem) {
                    var oData = oSelectedItem.getBindingContext("sEducationModel").getObject();
                    this.getView().getModel("educationModel").setData(oData);
                    this.ViewModel.setProperty("/fragmentSubmit", false);
                    this.ViewModel.setProperty("/fragmentSave", true);
                    this.SS_commonOpenDialog("SEd_oDialog", "sap.kt.com.minihrsolution.fragment.AddEducation", ["AddEd_id_StartEdu", "AddEd_id_EndEdu"]);
                } else {
                    MessageToast.show(this.i18nModel.getText("selectRow"));
                }
            },
            //Education detail create call
            saveEducationDetails: function (bIsCreate) {
                try {
                    const isValid = utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEd_id_College"), "ID") &&
                        utils._LCvalidateDate(sap.ui.getCore().byId("AddEd_id_StartEdu"), "ID") &&
                        utils._LCvalidateDate(sap.ui.getCore().byId("AddEd_id_EndEdu"), "ID") &&
                        utils._LCvalidateGrade(sap.ui.getCore().byId("AddEd_id_Grade"), "ID", "AddEd_id_GradeType");
                    if (!isValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }
                    // Get and prepare model data
                    let oModel = this.getView().getModel("educationModel").getData();
                    oModel.EmployeeID = this.EmployeeID;
                    oModel.DegreeName = sap.ui.getCore().byId("AddEd_id_Degree").getSelectedKey() || "";
                    oModel.GradeType = sap.ui.getCore().byId("AddEd_id_GradeType").getSelectedKey() || "";
                    oModel.EducationStartDate = sap.ui.getCore().byId("AddEd_id_StartEdu").getValue()
                    oModel.EducationStartDate = oModel.EducationStartDate.split("/").reverse().join('-');
                    oModel.EducationEndDate = sap.ui.getCore().byId("AddEd_id_EndEdu").getValue()
                    oModel.EducationEndDate = oModel.EducationEndDate.split("/").reverse().join('-');
                    let oPayload;
                    let fnCall;
                    let sSuccessMessage;
                    if (bIsCreate) {
                        oPayload = {
                            "tableName": "EducationalDetails",
                            "data": oModel
                        };
                        fnCall = this.ajaxCreateWithJQuery("EducationalDetails", oPayload, ["AddEd_id_Form", "EdF_id_EduTable"]);
                        sSuccessMessage = this.i18nModel.getText("eduDataSaved");
                    } else {
                        oPayload = {
                            "data": oModel,
                            "filters": {
                                "ID": oModel.ID
                            }
                        };
                        fnCall = this.ajaxUpdateWithJQuery("EducationalDetails", oPayload, ["EdF_id_EduTable", "AddEd_id_Form"]);
                        sSuccessMessage = this.i18nModel.getText("eduDataupdate");
                        this.setEduButtonsEnabled(false);
                    }
                    fnCall.then((oData) => {
                        if (oData.success) {
                            BusyIndicator.hide();
                            MessageToast.show(sSuccessMessage);
                            this.SEd_oDialog.close();
                            this.setEduButtonsEnabled(false);
                            this.byId("EdF_id_EduTable").removeSelections(true);
                            this.SS_commonEduFunction()
                            this._fetchCommonData("EducationalDetails", "sEducationModel", { EmployeeID: this.EmployeeID }, ["EdF_id_EduTable"]);
                        } else {
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        }
                    }).catch((error) => {
                        BusyIndicator.hide();
                        sap.m.MessageToast.show(error.responseText);
                    });
                } catch (error) {
                    BusyIndicator.hide();
                    sap.m.MessageToast.show(error.responseText);
                }
            },
            AddEd_onSubmitEdDetails: function () {
                this.saveEducationDetails(true); // create mode
            },
            AddEd_onUpdateEdDetails: function () {
                this.saveEducationDetails(false); // update mode
            },

            //Education detail delete call
            EdF_DeletEdu: function () {
                var that = this;
                var oSelectedItem = this.byId("EdF_id_EduTable").getSelectedItem();
                if (!oSelectedItem) {
                    sap.m.MessageToast.show(this.i18nModel.getText("selctRowtoDelete"));
                    return;
                }
                var oContext = oSelectedItem.getBindingContext("sEducationModel").getProperty("ID");
                // Use common confirmation dialog
                this.showConfirmationDialog(
                    this.i18nModel.getText("msgBoxConfirm"),
                    this.i18nModel.getText("edudeletConfirmation"),
                    function () {
                        that.ajaxDeleteWithJQuery("/EducationalDetails", { filters: { ID: oContext } }).then(() => {
                            sap.m.MessageToast.show(that.i18nModel.getText("eduDataDeletSuucess"));
                            that._fetchCommonData("EducationalDetails", "sEducationModel", { EmployeeID: that.EmployeeID }, ["EdF_id_EduTable"]);
                            that.setEduButtonsEnabled(false);
                        }).catch((error) => {
                            sap.m.MessageToast.show(error.responseText);
                        });
                    },
                    function () {      // On Cancel
                        that.byId("EdF_id_EduTable").removeSelections(true);
                        that.setEduButtonsEnabled(false);
                    }
                );
            },

            //Employment detail create calls
            saveEmploymentDetails: function (bIsCreate) {
                try {
                    const isValid = utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEmp_id_Company"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEmp_id_Desig"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEmp_id_OfcAddress"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("AddEmp_id_StartDate"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("AddEmp_id_EndDate"), "ID") && utils._LCvalidateName(sap.ui.getCore().byId("AdEmp_id_RCNameI"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AdEmp_id_RCAddressI"), "ID") && utils._LCvalidateEmail(sap.ui.getCore().byId("AdEmp_id_RCMailI"), "ID") &&
                        utils._LCvalidateMobileNumber(sap.ui.getCore().byId("AdEmp_id_RCMobileI"), "ID") && utils._LCvalidateName(sap.ui.getCore().byId("AdEmp_id_RCNameII"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AdEmp_id_RCAddressII"), "ID") && utils._LCvalidateEmail(sap.ui.getCore().byId("AdEmp_id_RCMailII"), "ID") && utils._LCvalidateMobileNumber(sap.ui.getCore().byId("AdEmp_id_RCMobileII"), "ID");
                    if (!isValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }
                    // Get and prepare model data
                    let oModel = this.getView().getModel("employmentModel").getData();
                    oModel.EmployeeID = this.EmployeeID;
                    oModel.Designation = sap.ui.getCore().byId("AddEmp_id_Desig").getValue();
                    oModel.RCISal = sap.ui.getCore().byId("AddEmp_id_SalI").getSelectedKey() || "";
                    oModel.RCIISal = sap.ui.getCore().byId("AdEmp_id_RCSalII").getSelectedKey() || "";
                    oModel.StartDate = sap.ui.getCore().byId("AddEmp_id_StartDate").getValue()
                    oModel.StartDate = oModel.StartDate.split("/").reverse().join('-');
                    oModel.EndDate = sap.ui.getCore().byId("AddEmp_id_EndDate").getValue()
                    oModel.EndDate = oModel.EndDate.split("/").reverse().join('-');
                    let oPayload;
                    let fnCall;
                    let sSuccessMessage;
                    if (bIsCreate) {
                        oPayload = {
                            "tableName": "EmploymentDetails",
                            "data": oModel
                        };
                        fnCall = this.ajaxCreateWithJQuery("EmploymentDetails", oPayload, ["AddEmp_id_Form", "EmpF_id_EmpTable"]);
                        sSuccessMessage = this.i18nModel.getText("empDataSaved");
                    } else {
                        oPayload = {
                            "data": oModel,
                            "filters": {
                                "ID": oModel.ID
                            }
                        };
                        fnCall = this.ajaxUpdateWithJQuery("EmploymentDetails", oPayload, ["AddEmp_id_Form", "EmpF_id_EmpTable"]);
                        sSuccessMessage = this.i18nModel.getText("empDataupdate");
                    }
                    fnCall.then((oData) => {
                        if (oData.success) {
                            BusyIndicator.hide();
                            MessageToast.show(sSuccessMessage);
                            this.SEmp_oDialog.close();
                            this.byId("EmpF_id_EmpTable").removeSelections(true);
                            this.setEmpButtonsEnabled(false);
                            this.SS_commonEmpFunction();
                            this._fetchCommonData("EmploymentDetails", "sEmploymentModel", { EmployeeID: this.EmployeeID }, ["EmpF_id_EmpTable"]);
                        } else {
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        }
                    }).catch((error) => {
                        BusyIndicator.hide();
                        MessageToast.show(error.responseText);
                    });
                } catch (error) {
                    BusyIndicator.hide();
                    MessageToast.show(error.responseText);
                }
            },
            AddEmp_onSubmitEmpDetails: function () {
                this.saveEmploymentDetails(true); // create mode
            },

            AddEmp_onUpdateEmpDetails: function () {
                this.saveEmploymentDetails(false); // update mode
            },
            EmpF_onSelectionChange: function (oEvent) {
                const aSelectedIndices = oEvent.getSource().getSelectedItems();
                if (aSelectedIndices.length > 0) {
                    this.setEmpButtonsEnabled(true);
                } else {
                    this.setEmpButtonsEnabled(false);
                }
            },
            EmpF_onEditEmployment: function () {
                var oSelectedItem = this.byId("EmpF_id_EmpTable").getSelectedItem();
                if (oSelectedItem) {
                    var oData = oSelectedItem.getBindingContext("sEmploymentModel").getObject();
                    this.getView().getModel("employmentModel").setData(oData);
                    this.ViewModel.setProperty("/fragmentSubmit", false);
                    this.ViewModel.setProperty("/fragmentSave", true);
                    this.SS_commonOpenDialog("SEmp_oDialog", "sap.kt.com.minihrsolution.fragment.AddEmployment", ["AddEmp_id_StartDate", "AddEmp_id_EndDate"]);
                } else {
                    MessageToast.show(this.i18nModel.getText("selectRow"));
                }
            },
            //Employment detail delete call
            EmpF_onDeletEmployment: function () {
                var that = this;
                var oSelectedItem = this.byId("EmpF_id_EmpTable").getSelectedItem();
                if (!oSelectedItem) {
                    sap.m.MessageToast.show(this.i18nModel.getText("selctRowtoDelete"));
                    return;
                }
                var oContext = oSelectedItem.getBindingContext("sEmploymentModel").getProperty("ID");
                // Show common confirmation dialog
                this.showConfirmationDialog(
                    this.i18nModel.getText("msgBoxConfirm"),
                    this.i18nModel.getText("empdeleteConfirmation"),
                    function () {
                        that.ajaxDeleteWithJQuery("/EmploymentDetails", { filters: { ID: oContext } }).then(() => {
                            sap.m.MessageToast.show(that.i18nModel.getText("empDataDeleteSuccess"));
                            that._fetchCommonData("EmploymentDetails", "sEmploymentModel", { EmployeeID: that.EmployeeID });
                            that.setEmpButtonsEnabled(false);
                        }).catch((error) => {
                            sap.m.MessageToast.show(error.responseText);
                        });
                    },
                    function () {
                        that.byId("EmpF_id_EmpTable").removeSelections(true);
                        that.setEmpButtonsEnabled(false);
                    }
                );
            },

            //Reference details
            EmpF_onReferenceDetails: function () {
                var that = this;
                var oTable = this.byId("EmpF_id_EmpTable");
                var aSelectedContexts = oTable.getSelectedContexts();
                if (aSelectedContexts.length === 0) {
                    sap.m.MessageToast.show(this.i18nModel.getText("selectRowToEdit"));
                    return;
                }
                var dataModel = aSelectedContexts[0].getObject();
                // Prepare formatted reference details HTML
                var formattedReferenceData = `
                    <div style="padding-left: 15px; padding-right: 15px;">
                        <p><b>Name:</b> ${dataModel.RCISal} ${dataModel.RCIName}</p>
                        <p><b>Contact Address:</b> ${dataModel.RCIAddress}</p>
                        <p><b>Email:</b> ${dataModel.RCIEmailID}</p>
                        <p><b>Mobile No:</b> ${dataModel.RCIMobileNo}</p>
                        <br/>
                        <p><b>Name:</b> ${dataModel.RCIISal} ${dataModel.RCIIName}</p>
                        <p><b>Contact Address:</b> ${dataModel.RCIIAddress}</p>
                        <p><b>Email:</b> ${dataModel.RCIIEmailID}</p>
                        <p><b>Mobile No:</b> ${dataModel.RCIIMobileNo}</p>
                    </div>`;
                // Create a dialog to display the reference details
                var oDialog = new sap.m.Dialog({
                    title: "Reference Details",
                    draggable: false,
                    resizable: false,
                    contentWidth: "500px",
                    contentHeight: "400px",
                    verticalScrolling: true,
                    content: new sap.ui.core.HTML({
                        content: formattedReferenceData
                    }),
                    beginButton: new sap.m.Button({
                        text: "Close",
                        type: "Reject",
                        press: function () {
                            oDialog.close();
                            oTable.removeSelections(true);
                            that.setEmpButtonsEnabled(false);
                        }
                    })
                });
                oDialog.open();
            },

            SS_readSalaryDetails: async function (filter) {
                try {
                    const oData = await this.ajaxReadWithJQuery("SalaryDetails", { EmployeeID: this.EmployeeID });
                    const offerData = Array.isArray(oData.data) ? oData.data : [oData.data];   
                    this.getOwnerComponent().setModel(new JSONModel(offerData), "salaryData");
                    this.displaySalaryPanels(offerData);
                } catch (error) {
                    MessageToast.show(error.message || error.responseText);
                }
            },
            
            displaySalaryPanels: function (salaryDetailsArray) {
                var oVBox = this.byId("salaryVBox");
                oVBox.removeAllItems(); 
                salaryDetailsArray.forEach(function (offerData) {
                    var sTitleText = `Appraisal Date: ${this.Formatter.formatDate(offerData.AppraisalDate)}, Effective Date: ${this.Formatter.formatDate(offerData.EffectiveDate || "")}, Yearly Gross: INR ${this.Formatter.fromatNumber(offerData.GrossPay)}`;
                    var oPanel = new sap.m.Panel({
                        headerText: sTitleText,
                        expandable: true,
                        expanded: true
                    });
                    var oFragModel = new sap.ui.model.json.JSONModel(offerData);
                    oPanel.setModel(oFragModel, "salaryData");
                    var oFragment = sap.ui.xmlfragment(this.getView().getId(), "sap.kt.com.minihrsolution.fragment.SalaryDisplay", this);
                    oPanel.addContent(oFragment);
                    oVBox.addItem(oPanel);
                }, this);
            },

            
            
           
            // displaySalaryDetails: function (salaryDetailsArray) {
            //     var oVBox = this.getView().byId("SS_id_FormsContainer");
            //     oVBox.removeAllItems();
            
            //     salaryDetailsArray.forEach(function (offerData, index) {
            //         var effectiveDate = offerData.EffectiveDate || "";
            //         var sTitleText = `Appraisal Date: ${this.Formatter.formatDate(offerData.AppraisalDate)}, Effective Date: ${this.Formatter.formatDate(effectiveDate)}, Yearly Gross: INR ${this.Formatter.fromatNumber(offerData.GrossPay)}`;
            
            //         // Yearly Earnings Form
            //         var oYearlyEarningsForm = new sap.ui.layout.form.SimpleForm({
            //             editable: false,
            //             layout: "ResponsiveGridLayout",
            //             title: this.i18nModel.getText("yearly"),
            //             content: [
            //                 new sap.m.Label({ text: this.i18nModel.getText("basicSalary") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.BasicSalary)}` }),
            
            //                 new sap.m.Label({ text: this.i18nModel.getText("hra") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.HRA)}` }),
            
            //                 new sap.m.Label({ text: this.i18nModel.getText("eplyrPF") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.EmployerPF)}` }),
            
            //                 new sap.m.Label({ text: this.i18nModel.getText("medicalInsurance") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.MedicalInsurance)}` }),
            
            //                 new sap.m.Label({ text: this.i18nModel.getText("gratuity") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.Gratuity)}` }),
            
            //                 new sap.m.Label({ text: this.i18nModel.getText("SpecailAllowance") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.SpecailAllowance)}` }),
            
            //                 new sap.m.Label({ text: this.i18nModel.getText("Total") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.Total)}` })
            //             ]
            //         });
            
            //         // Yearly Deductions Form
            //         var oYearlyDeductionsForm = new sap.ui.layout.form.SimpleForm({
            //             editable: false,
            //             layout: "ResponsiveGridLayout",
            //             title: this.i18nModel.getText("Deductions"),
            //             content: [
            //                 new sap.m.Label({ text: this.i18nModel.getText("providentFund") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.EmployeePF)}` }),
            
            //                 new sap.m.Label({ text: this.i18nModel.getText("performanceTax") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.PT)}` }),
            
            //                 new sap.m.Label({ text: this.i18nModel.getText("incomeTax") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.IncomeTax)}` }),
            
            //                 new sap.m.Label({ text: this.i18nModel.getText("totalDeductionAmount") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.TotalDeduction)}` }),
            
            //                 new sap.m.Label({ text: this.i18nModel.getText("variablePayTotal") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.VariablePay)}` }),
            
            //                 new sap.m.Label({ text: this.i18nModel.getText("grossPayTotal") }),
            //                 new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.GrossPay)}` })
            //             ]
            //         });
            
            //         // HBox to align Earnings and Deductions side by side
            //         var oTopHBox = new sap.m.HBox({
            //             justifyContent: "SpaceAround",
            //             alignItems: "Start",
            //             items: [oYearlyEarningsForm, oYearlyDeductionsForm]
            //         });
            
            //         // Summary Section
            //         var oSummaryFlex = new sap.m.FlexBox({
            //             direction: "Row",
            //             wrap: "Wrap",
            //             justifyContent: "Start",
            //             items: [
            //                 new sap.m.VBox({
            //                     width: "200px",
            //                     items: [
            //                         new sap.m.Label({ text: this.i18nModel.getText("yearlyGrossPay") }).addStyleClass("boldBlackText"),
            //                         new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.GrossPay)}` })
            //                     ]
            //                 }),
            //                 new sap.m.VBox({
            //                     width: "200px",
            //                     items: [
            //                         new sap.m.Label({ text: this.i18nModel.getText("yearlyDeduction") }).addStyleClass("boldBlackText"),
            //                         new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.TotalDeduction)}` })
            //                     ]
            //                 }),
            //                 new sap.m.VBox({
            //                     width: "200px",
            //                     items: [
            //                         new sap.m.Label({ text: this.i18nModel.getText("EmpOfferVariablePay") }).addStyleClass("boldBlackText"),
            //                         new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.VariablePay)}` })
            //                     ]
            //                 }),
            //                 new sap.m.VBox({
            //                     width: "200px",
            //                     items: [
            //                         new sap.m.Label({ text: this.i18nModel.getText("joiningBonus") }).addStyleClass("boldBlackText"),
            //                         new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.JoiningBonus)}` })
            //                     ]
            //                 }),
            //                 new sap.m.VBox({
            //                     width: "200px",
            //                     items: [
            //                         new sap.m.Label({ text: this.i18nModel.getText("costOfCompany") }).addStyleClass("boldBlackText"),
            //                         new sap.m.Text({ text: `INR ${this.Formatter.fromatNumber(offerData.CostofCompany)}` })
            //                     ]
            //                 })
            //             ]
            //         });
            
            //         // Final Panel
            //         var oPanel = new sap.m.Panel({
            //             headerToolbar: new sap.m.Toolbar({
            //                 content: [
            //                     new sap.m.Title({
            //                         text: sTitleText,
            //                         level: "H6",
            //                         titleStyle: "H6",
            //                         wrapping: true
            //                     }).addStyleClass("sapUiTinyMarginBeginEnd")
            //                 ]
            //             }),
            //             expandable: true,
            //             expanded: true,
            //             content: [
            //                 new sap.m.VBox({
            //                     items: [
            //                         oTopHBox,
            //                         new sap.m.Label({ text: "Summary" }).addStyleClass("boldBlackText"),
            //                         oSummaryFlex
            //                     ]
            //                 })
            //             ]
            //         }).addStyleClass("sapUiSmallMarginBottom");
            
            //         oVBox.addItem(oPanel);
            //     }.bind(this));
            // },
                 
            //On icon tab select function
            SS_onTabSelect: function (oEvent) {
                var oView = this.getView();
                var oViewModel = oView.getModel("viewModel");
                var isEditMode = oViewModel.getProperty("/isEditMode");
                var sKey = oEvent.getParameter("key");
                if (isEditMode) {
                    this.showConfirmationDialog(
                        this.i18nModel.getText("confirmTitle"),
                        this.i18nModel.getText("tabConfirmation"),
                        async () => {
                            oViewModel.setProperty("/isEditMode", false);
                            await this._fetchCommonData("EmployeeDetails", "sEmployeeModel", { EmployeeID: this.EmployeeID });
                            this.SS_CommonID();
                            await this._handleTabSwitch(sKey);
                        },
                        null,
                        this.i18nModel.getText("OkButton"),
                        this.i18nModel.getText("CancelButton")
                    );
                } else {
                    this._handleTabSwitch(sKey);
                }
            },

            _handleTabSwitch: async function (sKey) {
                this.getView().setBusy(true);
                try {
                    let oViewModel = this.getView().getModel("viewModel");
                    oViewModel.setProperty("/isEditButtonVisible", false);
                    if (sKey === "employeeDetailsKey") {
                        oViewModel.setProperty("/isEditButtonVisible", true);
                        await this._fetchCommonData("EmployeeDetails", "sEmployeeModel", { EmployeeID: this.EmployeeID });
                    } else if (sKey === "educationDetailKey") {
                        await this._fetchCommonData("EducationalDetails", "sEducationModel", { EmployeeID: this.EmployeeID }, ["EdF_id_EduTable"]);
                    } else if (sKey === "employmentKey") {
                        await this._fetchCommonData("EmploymentDetails", "sEmploymentModel", { EmployeeID: this.EmployeeID }, ["EmpF_id_EmpTable"]);
                    } else if (sKey === "salaryKey") {
                        await this._fetchCommonData("SalaryDetails", "salaryData", { EmployeeID: this.EmployeeID });
                    } else if (sKey === "paySlipKey") {
                        // Future logic for payslip tab
                    }
                } catch (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show(oError.responseText);
                } finally {
                    this.getView().setBusy(false);
                }
            },
            SS_onDownloadTerminateLetter: function () {
                var oEmpModel = this.getView().getModel("sEmployeeModel").getData()[0];
                var date = Formatter.formatDate(new Date());
                var empName = oEmpModel.Salutation + " " + oEmpModel.EmployeeName;
                var empDesig = oEmpModel.Designation;
                this.getView().getModel("PDFData").setProperty("/CreateDate", date);
                this.getView().getModel("PDFData").setProperty("/CertificateTitle", "TERMINATION LETTER");
                var data = `
                <div style="text-align: justify;">
                    <p>This is to formally notify that <b>${empName}</b>, has been terminated from the services of <b>${this.companyName}</b> with effect from <b>${date}</b> due to reasons communicated during prior discussions. During their tenure as <b>${empDesig}</b>, we have reviewed the performance and discussed areas of concern in detail.</p> 
                    <p>Despite efforts to resolve these concerns, we find it necessary to discontinue the employment relationship effective immediately. Please ensure that all company assets and materials in your possession are returned by the specified date. You are reminded of your obligation to maintain confidentiality and abide by other terms of the employment agreement.</p>
                    <p>Kindly acknowledge the copy of the document for office records. We look forward to a fruitful association.</p>
                    <p>We wish you the best of luck in your future endeavors</p>
                </div>`;

                this.getView().getModel("PDFData").setProperty("/RTEText", data);
                this.SS_commonOpenDialog("SSRTE_oDialog", "sap.kt.com.minihrsolution.fragment.CommonRTE");
            },

            SS_onDownloadExperienceLetter: function () {
                var oEmpModel = this.getView().getModel("sEmployeeModel").getData()[0];
                var today = new Date();
                var date = Formatter.formatDate(today);
                var twoMonthsLater = new Date(today.setMonth(today.getMonth() + 2));
                var relievingDate = Formatter.formatDate(twoMonthsLater);
                var joiningDate = Formatter.formatDate(oEmpModel.JoiningDate);
                var empName = oEmpModel.Salutation + " " + oEmpModel.EmployeeName;
                var empID = oEmpModel.EmployeeID;
                var empDesig = oEmpModel.Designation;
                this.getView().getModel("PDFData").setProperty("/CreateDate", date);
                this.getView().getModel("PDFData").setProperty("/CertificateTitle", "RELIEVING AND EXPERIENCE LETTER");
                var data = `
                <div style="text-align: justify;">
                    <p> This is to certify that <b>${empName}</b> with Employee ID <b>${empID}</b> has worked with our company <b>${this.companyName}</b> as a <b>${empDesig}</b> from <b>${joiningDate}</b> to <b>${date}</b>. During his tenure with us his contributions to the organization are highly appreciated. He possesses good moral values and the right attitude</p> 
                    <p>With reference to your resignation, you stand relieved from the services of ${this.companyName} with effect from the close of working hours <b>${relievingDate}</b>. We would like you to continue to be bound by the conditions of confidentiality and other relevant terms of the employment agreement you signed with ${this.companyName}</p>
                    <p>Wishing you all the best in your future endeavors</p>
                </div>`;

                this.getView().getModel("PDFData").setProperty("/RTEText", data);
                this.SS_commonOpenDialog("SSRTE_oDialog", "sap.kt.com.minihrsolution.fragment.CommonRTE");
            },

            FCR_onDownloadPDF: function () {
                this.SSRTE_oDialog.close();
                let htmlContent = sap.ui.getCore().byId("FCR_id_RTE").getValue();
                this.generateCertificatePDF(htmlContent, this.getView().getModel("sEmployeeModel").getData()[0].BranchCode);
            },

            FCR_onCloseDialog: function () {
                this.SSRTE_oDialog.close();
            },

             //  download Visiting Card
            onDownloadVisitCard: function () {
                var oEmployeeData = this.getView().getModel("sEmployeeModel").getData();
                if (oEmployeeData) {
                    this.CommonVisitingCard(oEmployeeData[0].EmployeeName, oEmployeeData[0].MobileNo, oEmployeeData[0].CompanyEmailID,
                    oEmployeeData[0].Designation, oEmployeeData[0].BranchCode);
                }
            },  
        });
    });