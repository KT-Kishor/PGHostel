sap.ui.define(
    [
        "./BaseController",
        "sap/m/MessageToast",
        "../model/formatter",
        "sap/ui/model/json/JSONModel",
        "../utils/validation"
    ],
    (
        BaseController,
        MessageToast,
        formatter,
        JSONModel,
        utils
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
                _onObjectMatched:async function () {
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
                            { key: 1, text: "YES" },
                            { key: 2, text: "NO" },
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

                RE_FilterBaronSearch: function (oEvent) {
                    let a = this.byId("RE_Id_ComboBoxFilterField1").getValue();
                    let c = this.byId("RE_Id_ComboBoxFilterField3").getValue();

                    let oTable = this.byId("RE_Id_MainTable");
                    let oBinding = oTable.getBinding("items");

                    let aFilters = [];

                    if (a) {
                        aFilters.push(
                            new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.EQ, a)
                        );
                    }
                    if (c) {
                        aFilters.push(
                            new sap.ui.model.Filter(
                                "NoticePeriod",
                                sap.ui.model.FilterOperator.EQ,
                                c
                            )
                        );
                    }
                    oBinding.filter(aFilters);
                    // this.RE_ReadUpdatedDataFromBakend();
                },

                RE_RemoveValueFilterBar: function () {
                    this.byId("RE_Id_ComboBoxFilterField1").setValue("");
                    this.byId("RE_Id_ComboBoxFilterField3").setValue("");
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
                        let rowselect = this.i18na.getText("MessageNoRowSelected")
                        MessageToast.show(rowselect);
                        return;
                    }
                    let oContext = oSelectedItem.getBindingContext("myModel");
                    this.id = oContext.getObject().ID;

                    const payLoad = {
                        filters: {
                            ID: this.id,
                        },
                    };
                    this.getBusyDialog();
                      this.ajaxDeleteWithJQuery("CandidateProfile",payLoad).then((response)=>{
                        this.closeBusyDialog();
                        let dataDeleteSuccess = this.i18na.getText("dataDelteSucces");
                            MessageToast.show(dataDeleteSuccess);
                            this.RE_ReadUpdatedDataFromBakend();
                      })
                   
                    this.getView().byId("RE_Id_MainTable").removeSelections();
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
            }
        );
    }
);
