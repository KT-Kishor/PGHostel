sap.ui.define(
    [
        "./BaseController",
        "sap/m/MessageToast",
        "../model/formatter",
        "sap/ui/model/json/JSONModel",
        "../utils/validation",
        "sap/ui/export/Spreadsheet",
    ],
    (
        BaseController,
        MessageToast,
        formatter,
        JSONModel,
        utils,
        Spreadsheet
    ) => {
        "use strict";

        return BaseController.extend(
            "sap.kt.com.minihrsolution.controller.Recruitment",
            {
                formatter: formatter,
                onInit() {
                    const router = this.getOwnerComponent().getRouter();
                    router
                        .getRoute("Recruitment")
                        .attachPatternMatched(this._onObjectMatched, this);
                },
                _onObjectMatched: async function () {
                    var LoginFUnction = await this.commonLoginFunction("Recruitment");
                    if (!LoginFUnction) return;
                    this.i18na = this.getOwnerComponent()
                        .getModel("i18n")
                        .getResourceBundle();

                    var miDate = new Date();
                    var maximuDate = new Date();
                    maximuDate.setDate(maximuDate.getDate() + 30);

                    var myModel = new JSONModel({
                        minnDate: miDate,
                        maxDates: maximuDate,
                    });
                    this.getView().setModel(myModel, "myyModel");

                    const valueState = new JSONModel({
                        NameState: "None",
                        ExpectedCTCState: "None",
                        CurrentCTCState: "None",
                        AvailableForInterviewState: "None",
                        NoticePeriodState: "None",
                        MobileNumberState: "None",
                        DateState: "None",
                        EmailIDState: "None",
                        ExperienceState: "None",
                        RemarkState: "None",
                        SkillsState: "None",
                        City: "None",
                    });
                    this.getView().setModel(valueState, "modelValuStateError");

                    const EditableModel = new JSONModel({
                        Editable: true,
                    });
                    const InterviewYesNo = new JSONModel({
                        results: [
                            { key: "YES", text: "YES" },
                            { key: "NO", text: "NO" },
                        ],
                    });
                    this.getView().setModel(InterviewYesNo, "setInterviewYesNo");
                    this.getView().setModel(EditableModel, "EditableModeltruefalse");
                    this.RE_ReadUpdatedDataFromBakend();
                    this.RE_RemoveValueState();
                    this.getView().getModel("LoginModel").setProperty("/HeaderName", "Recruitment Details");

                },

                //Add student function all data
                RE_AddNewStudentData: function () {
                    let flag = "Create Candidate";
                    const studentData = new JSONModel({
                        Name: "",
                        ExpectedCTC: "",
                        CurrentCTC: "",
                        AvailableForInterview: "",
                        NoticePeriod: "",
                        MobileNumber: "",
                        Date: "",
                        EmailID: "",
                        Experience: "",
                        Remark: "",
                        Skills: "",
                        STDCode: "",
                        City: "",
                        Country: "",
                    });
                    this.getView().setModel(studentData, "stuDataModel");
                    this.FRE_CommonDialogFunction(false, true, flag, false);
                    this.getView().byId("RE_Id_MainTable").removeSelections();
                    this.getView()
                        .getModel("EditableModeltruefalse")
                        .setProperty("/Editable", true);
                },

                FRE_CloseFragment: function () {
                    this.oDialog.close();
                    this.RE_RemoveValueState();
                    sap.ui.getCore().byId("FM_Id_EditBTN").setText("Edit");
                },

                FRE_UpDateTimeFragmentFieldEditable: function () {

                    let ButtonText = sap.ui.getCore().byId("FM_Id_EditBTN").getText();
                    if (ButtonText === "Edit") {
                        this.getView()
                            .getModel("EditableModeltruefalse")
                            .setProperty("/Editable", true);
                        sap.ui.getCore().byId("FM_Id_EditBTN").setText("Save")
                    } else {
                        if (!this.RE_UpdateStudent()) {
                            return;
                        }
                    }
                },

                FRE_CountryLiveChange: function (oEvent) {
                    let sValue = sap.ui
                        .getCore()
                        .byId("FM_Id_Country")
                        .getSelectedKey()
                        ? sap.ui.getCore().byId("FM_Id_Country").getSelectedKey()
                        : sap.ui.getCore().byId("FM_Id_Country").getValue();

                    var oFilter = new sap.ui.model.Filter(
                        "CountryCode",
                        sap.ui.model.FilterOperator.EQ,
                        sValue
                    );
                    sap.ui.getCore().byId("FM_Id_City").getBinding("items").filter(oFilter);
                    this.getView().getModel("stuDataModel").setProperty("/City", "");

                },

                RE_StudentDataSave: async function () {
                    let getDataStudentmodel = this.getView()
                        .getModel("stuDataModel")
                        .getData();

                    if (!this.FRE_ValidateAllFields()) {
                        return;
                    }

                    let noticeperiod = sap.ui.getCore().byId("FM_RE_NoticePeriod").getValue();
                    getDataStudentmodel.NoticePeriod = noticeperiod;
                    let date = sap.ui.getCore().byId("FM_Id_DateAvlForInterview").getValue();
                    let b = date.split(".").reverse().join("/");
                    getDataStudentmodel.Date = b;

                    var sendDataToBackend = {
                        data: getDataStudentmodel,
                    };
                    this.getBusyDialog();
                    await this.ajaxCreateWithJQuery("CandidateProfile", { data: getDataStudentmodel }).then((response) => {
                        // this.closeBusyDialog();
                        let messageTraineeCrea = this.i18na.getText("messageTraineeCreated")
                        MessageToast.show(messageTraineeCrea)
                        this.RE_ReadUpdatedDataFromBakend();
                    }).catch((err) => {
                        this.closeBusyDialog();
                        MessageToast.show(err.message || err.responseText)
                    })

                    this.oDialog.close();
                    //this.RE_RemoveValueState();
                },

                //Update Candidate Data
                FRE_ColumnClickFragmentOpenForUpdate: function (oEvent) {
                    let flag = "Edit Candidate";
                    var oTable = this.getView().byId("RE_Id_MainTable");
                    var oSelectedItem = oTable.getSelectedItem();

                    if (!oSelectedItem) {
                        let rowselect = this.i18na.getText("MessageNoRowSelected")
                        MessageToast.show(rowselect);
                        return;
                    }

                    let oContext = oSelectedItem.getBindingContext("myModel");
                    this.oData = oContext.getObject();

                    if (this.oData.Date === "1899-11-30T00:00:00.000Z") {
                        this.oData.Date = null;
                    }
                    const studentData = new JSONModel(this.oData);
                    this.getView().setModel(studentData, "stuDataModel");
                    this.FRE_CommonDialogFunction(true, false, flag, true);
                    this.getView().byId("RE_Id_MainTable").removeSelections();
                    this.getView()
                        .getModel("EditableModeltruefalse")
                        .setProperty("/Editable", false);
                },
                FRE_CommonDialogFunction: function (value1, value2, flag, value3) {
                    let oView = this.getView();
                    // this.getBusyDialog();
                    if (!this.oDialog) {
                        this.oDialog = sap.ui.core.Fragment.load({
                            name: "sap.kt.com.minihrsolution.fragment.AddRecruitment",
                            controller: this,
                        }).then((oDialog) => {
                            this.oDialog = oDialog;
                            oView.addDependent(this.oDialog);
                            this.oDialog.open();

                            this.FRE_CommonFuncPassingValuesInFragment(
                                flag,
                                value1,
                                value2,
                                value3
                            );
                        });
                    } else {
                        this.oDialog.open();
                        this.FRE_CommonFuncPassingValuesInFragment(
                            flag,
                            value1,
                            value2,
                            value3
                        );
                    }
                },
                FRE_CommonFuncPassingValuesInFragment: function (
                    flag,
                    value1,
                    value2,
                    value3
                ) {
                    let oStuDataModel = this.getView().getModel("stuDataModel");
                    sap.ui.getCore().byId("myDialog").setTitle(flag);
                    this.closeBusyDialog();
                    sap.ui.getCore().byId("FM_Id_SubmitBTN").setVisible(value2);
                    sap.ui.getCore().byId("FM_Id_EditBTN").setVisible(value3);
                    sap.ui.getCore().byId("FM_Id_EditBTN").setText("Edit")
                    sap.ui.getCore().byId("FM_Id_EditBTN").setType("Accept")

                    if (flag === "Create Candidate") {
                        oStuDataModel.setProperty("/STDCode", "+91");
                        oStuDataModel.setProperty("/Country", "IN");
                    }
                },
                RE_UpdateStudent: async function (oEvent) {
                    let getDataStudentmodel = this.getView()
                        .getModel("stuDataModel")
                        .getData();
                    // let id = this.oData.ID;
                    let id = getDataStudentmodel.ID
                    if (!this.FRE_ValidateAllFields()) {
                        return;
                    }
                    sap.ui.getCore().byId("FM_Id_EditBTN").setText("Edit")

                    let noticeperiod = sap.ui.getCore().byId("FM_RE_NoticePeriod").getValue();
                    getDataStudentmodel.NoticePeriod = noticeperiod;

                    let date = sap.ui.getCore().byId("FM_Id_DateAvlForInterview").getValue();
                    let b = date.split(".").reverse().join("/");
                    getDataStudentmodel.Date = null || b;

                    const payload = {
                        data: getDataStudentmodel,
                        filters: {
                            ID: id,
                        },
                    };

                    this.getBusyDialog();
                    await this.ajaxUpdateWithJQuery("CandidateProfile", payload).then((response) => {
                        this.closeBusyDialog();
                        let dataUpdatedSuccess = this.i18na.getText("dataUpdatedSuccess");
                        MessageToast.show(dataUpdatedSuccess);
                        this.RE_ReadUpdatedDataFromBakend();
                    })

                    this.oDialog.close();
                    this.getView().byId("RE_Id_MainTable").removeSelections();
                },

                RE_FilterBaronSearch: async function (oEvent) {
                    let a = this.byId("RE_Id_ComboBoxFilterField1").getValue();
                    let b = this.byId("RE_Id_ComboBoxFilterField3").getValue();
                    let c = this.byId("RE_Id_ComboBoxFilterField4").getValue();
                    let d = this.byId("RE_ID_Experince").getValue();

                    if (!b) {
                        this.Data = ""
                    } else {
                        this.Data = "1-" + b;
                    }

                    var filter = {
                        "Name": a,
                        "NoticePeriod": this.Data,
                        "Skills": c,
                        "Experience":d
                    }

                    this.getBusyDialog();
                    await this._fetchCommonData("CandidateProfile", "myModel", filter)
                        .then((response) => {
                            this.closeBusyDialog();
                        })
                },

                RE_RemoveValueFilterBar: function () {
                    this.byId("RE_Id_ComboBoxFilterField1").setValue("");
                    this.byId("RE_Id_ComboBoxFilterField3").setValue("");
                    this.byId("RE_Id_ComboBoxFilterField4").setValue("");
                    this.byId("RE_ID_Experince").setValue("");
                    this.getView().byId("RE_Id_MainTable").removeSelections();
                },

                RE_ReadUpdatedDataFromBakend: async function () {
                    var oView = this.getOwnerComponent();
                    this.getBusyDialog();
                    await this._fetchCommonData("CandidateProfile", "myModel");
                    this.closeBusyDialog();
                },

                FRE_ValidateAllFields: function () {
                    var flag = true;
                    let valueStateModel = this.getView().getModel("modelValuStateError");
                    let getDataStudentmodel = this.getView()
                        .getModel("stuDataModel")
                        .getData();

                    if (getDataStudentmodel.Name === "") {
                        flag = false;
                        valueStateModel.setProperty("/NameState", "Error");
                    }
                    if (getDataStudentmodel.ExpectedCTC === "") {
                        flag = false;
                        valueStateModel.setProperty("/ExpectedCTCState", "Error");
                    }
                    if (getDataStudentmodel.CurrentCTC === "") {
                        flag = false;
                        valueStateModel.setProperty("/CurrentCTCState", "Error");
                    }
                    if (getDataStudentmodel.City === "") {
                        flag = false;
                        valueStateModel.setProperty("/City", "Error");
                    }
                    if (!getDataStudentmodel.AvailableForInterview) {
                        flag = false;
                        valueStateModel.setProperty("/AvailableForInterviewState", "Error");
                    }
                    if (!sap.ui.getCore().byId("FM_RE_NoticePeriod").getValue()) {
                        flag = false;
                        valueStateModel.setProperty("/NoticePeriodState", "Error");
                    }
                    if (
                        getDataStudentmodel.MobileNumber === "" ||
                        valueStateModel.getProperty("/MobileNumberState") === "Error"
                    ) {
                        flag = false;
                        valueStateModel.setProperty("/MobileNumberState", "Error");
                    }

                    if (
                        getDataStudentmodel.EmailID === "" ||
                        valueStateModel.getProperty("/EmailIDState") === "Error"
                    ) {
                        flag = false;
                        valueStateModel.setProperty("/EmailIDState", "Error");
                    }
                    if (getDataStudentmodel.Experience === "") {
                        flag = false;
                        valueStateModel.setProperty("/ExperienceState", "Error");
                    }

                    if (getDataStudentmodel.Skills === "") {
                        flag = false;
                        valueStateModel.setProperty("/SkillsState", "Error");
                    }
                    if (flag === false) {
                        let allFieldsMandetory = this.i18na.getText("mandatoryFieldsError");
                        MessageToast.show(allFieldsMandetory);
                        return false;
                    }
                    return true;
                },

                RE_DeleteUser: function (oEvent) {
                    var oTable = this.getView().byId("RE_Id_MainTable");
                    var oSelectedItem = oTable.getSelectedItem();

                    if (!oSelectedItem) {
                        let rowselect = this.i18na.getText("MessageNoRowSelected");
                        MessageToast.show(rowselect);
                        return;
                    }

                    let oContext = oSelectedItem.getBindingContext("myModel");
                    this.id = oContext.getObject().ID;

                    // Get localized confirmation message
                    let sTitle = this.i18na.getText("confirmTitle");
                    let sMessage = this.i18na.getText("ConfirmRecruitmentDeleteMessage");
                    let sOkText = this.i18na.getText("OkButton");
                    let sCancelText = this.i18na.getText("CancelButton");

                    // Show confirmation dialog
                    this.showConfirmationDialog(sTitle, sMessage,
                        function () {
                            // On Confirm
                            const payLoad = {
                                filters: {
                                    ID: this.id,
                                },
                            };
                            this.getBusyDialog();
                            this.ajaxDeleteWithJQuery("CandidateProfile", payLoad).then((response) => {
                                this.closeBusyDialog();
                                let dataDeleteSuccess = this.i18na.getText("dataDelteSucces");
                                MessageToast.show(dataDeleteSuccess);
                                this.RE_ReadUpdatedDataFromBakend();
                            });
                            oTable.removeSelections();
                        }.bind(this),

                        function () {
                        }.bind(this),
                        sOkText,
                        sCancelText
                    );
                },

                RE_RemoveValueState: function () {
                    const valueState = new JSONModel({
                        NameState: "None",
                        ExpectedCTCState: "None",
                        CurrentCTCState: "None",
                        AvailableForInterviewState: "None",
                        NoticePeriodState: "None",
                        MobileNumberState: "None",
                        DateState: "None",
                        EmailIDState: "None",
                        ExperienceState: "None",
                        RemarkState: "None",
                        SkillsState: "None",
                        City: "None",
                    });
                    this.getView().setModel(valueState, "modelValuStateError");
                },

                //VAlidations Functions
                RE_ValidateName: function (oEvent) {
                    utils._LCvalidateName(oEvent);
                },

                RE_ValidateNameExpectedCTC: function (oEvent) {
                    let modelValuState = this.getView().getModel("modelValuStateError");
                    const oInput = oEvent.getSource();
                    let sValue = oEvent.getParameter("value");
                    let event = oEvent.getParameter("id");
                    sValue = sValue.replace(/[^0-9.\-]/g, "");

                    const firstDotIndex = sValue.indexOf(".");
                    if (firstDotIndex !== -1) {
                        const beforeDot = sValue.slice(0, firstDotIndex + 1);
                        const afterDot = sValue.slice(firstDotIndex + 1).replace(/\./g, "");
                        sValue = beforeDot + afterDot;
                    }

                    if (sValue.indexOf(".") !== -1) {
                        const decimalPart = sValue.split(".")[1];
                        if (decimalPart && decimalPart.length > 2) {
                            sValue = sValue.substring(0, sValue.indexOf(".") + 3);
                        }
                    }

                    let salaryregex = /^[\d\-]{1,20}(\.\d{1,20})?$/;
                    if (event === "FM_RE_ExpectedCTC") {
                        if (salaryregex.test(sValue)) {
                            modelValuState.setProperty("/ExpectedCTCState", "None");
                        } else {
                            modelValuState.setProperty("/ExpectedCTCState", "Error");
                        }
                    } else if (event === "FM_RE_CurrentCTC") {
                        if (salaryregex.test(sValue)) {
                            modelValuState.setProperty("/CurrentCTCState", "None");
                        } else {
                            modelValuState.setProperty("/CurrentCTCState", "Error");
                        }
                    } else if (event === "FM_RE_NoticePeriod") {
                        if (salaryregex.test(sValue)) {
                            modelValuState.setProperty("/NoticePeriodState", "None");
                        } else {
                            modelValuState.setProperty("/NoticePeriodState", "Error");
                        }
                    } else {
                        if (salaryregex.test(sValue)) {
                            modelValuState.setProperty("/ExperienceState", "None");
                        } else {
                            modelValuState.setProperty("/ExperienceState", "Error");
                        }
                    }
                    oInput.setValue(sValue);
                },
                FRE_ValidateAvlForIntervewField: function (oEvent) {
                    let modelValuState = this.getView().getModel("modelValuStateError");
                    var val = sap.ui.getCore().byId("FM_RE_AvlInterview").getValue();

                    if (val === "") {
                        modelValuState.setProperty("/AvailableForInterviewState", "Error");
                    } else {
                        modelValuState.setProperty("/AvailableForInterviewState", "None");
                    }
                },
                RE_ValidateMobileField: function (oEvent) {
                    utils._LCvalidateMobileNumber(oEvent);
                },
                RE_VAlidateEmailField: function (oEvent) {

                    utils._LCvalidateEmail(oEvent);
                },
                RE_ValidateRemarkField: function (oEvent) {
                    let modelValuState = this.getView().getModel("modelValuStateError");
                    let sValue = oEvent.getParameter("value");
                    let id = oEvent.getParameter("id");
                    if (id === "FM_Id_Skills") {
                        if (sValue) {
                            modelValuState.setProperty("/SkillsState", "None");
                        } else {
                            modelValuState.setProperty("/SkillsState", "Error");
                        }
                    }
                },

                RE_ValidateCityField: function (oEvent) {
                    let modelValuState = this.getView().getModel("modelValuStateError");
                    let sValue = oEvent.getSource().getSelectedKey();
                    if (!sValue) {
                        modelValuState.setProperty("/City", "Error");
                    } else {
                        modelValuState.setProperty("/City", "None");
                    }
                },
                onPressback: function () {
                    this.getOwnerComponent().getRouter().navTo("RouteTilePage"); // Navigate to tile page
                },
                onLogout: function () {
                    this.CommonLogoutFunction(); // Navigate to login page
                },

                ExportTableData: function () {
                    let aData = this.getView().getModel("myModel")
                    let a = aData.getData()
                    // console.log(aData);

                    // Step 2: Define the columns for export
                    let updatedData = a.map((elem) => {
                        return {
                            ...elem, // keep other properties
                            Date: elem.Date === "1899-11-30T00:00:00.000Z" ? "" : formatter.formatDate(elem.Date),
                        };
                    });
                    // console.log(updatedData);

                    var aCols = [
                        { label: "Name", property: "Name" },
                        { label: "Country", property: "Country" },
                        { label: "City", property: "City" },
                        { label: "Available for interview", property: "AvailableForInterview" },
                        { label: "Current CTC", property: "CurrentCTC" },
                        { label: "Expected CTC", property: "ExpectedCTC" },
                        { label: "Experience", property: "Experience" },
                        { label: "Date", property: "Date", type: "string" },
                        { label: "STDCode", property: "STDCode" },
                        { label: "Mobile Number", property: "MobileNumber" },
                        { label: "Notice Period", property: "NoticePeriod" },
                        { label: "Remark", property: "Remark" },
                        { label: "Skills", property: "Skills" },
                    ];

                    // Step 3: Create Spreadsheet instance
                    var oSettings = {
                        workbook: {
                            columns: aCols
                        },
                        dataSource: updatedData,
                        fileName: "ExportedData.xlsx",
                        worker: true
                    };

                    var oSheet = new Spreadsheet(oSettings);
                    oSheet.build().finally(function () {
                        oSheet.destroy();
                    });
                },
                // Utility function to extract unique skills and set to model
                onSuggestSkills: function (oEvent) {
                    let sValue = oEvent.getParameter("suggestValue")?.toLowerCase() || "";

                    let aTableData = this.getView().getModel("myModel").getData();

                    // --- Suggest skill strings ---
                    let aMatchingSkillStrings = aTableData
                        .map(item => item.Skills?.trim())
                        .filter(skillStr => {
                            if (!skillStr) return false;
                            return skillStr
                                .split(",")
                                .some(skill => skill.trim().toLowerCase().includes(sValue));
                        });

                    let aUniqueSkillStrings = [...new Set(aMatchingSkillStrings)];
                    let aSuggestionItems = aUniqueSkillStrings.map(skill => ({ skill }));

                    let oSuggestModel = new sap.ui.model.json.JSONModel({ skills: aSuggestionItems });
                    this.getView().setModel(oSuggestModel, "skillModel");

                    // --- Filter candidate data based on skill match ---
                    let aFilteredCandidates = aTableData.filter(item => {
                        if (!item.Skills) return false;
                        return item.Skills
                            .split(",")
                            .some(skill => skill.trim().toLowerCase().includes(sValue));
                    });

                    // Set the filtered data to a model bound to your table
                    let oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredCandidates);
                    this.getView().setModel(oFilteredModel, "filteredModel");
                }
            }
        );
    }
);

