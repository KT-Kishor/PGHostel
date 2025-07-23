sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "../model/formatter",
    "../utils/validation",
  ],
  (
    BaseController,
    JSONModel,
    MessageToast,
    Fragment,
    formatter,
    validation
  ) => {
    "use strict";

    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.HP_View",
      {
        formatter: formatter,

        onInit: function () {
          const aLocations = this.getView()
            .getModel("BaseLocationModel")
            ?.getProperty("/results");
          console.log("aLocations", aLocations);
          const router = this.getOwnerComponent().getRouter();
          router
            .getRoute("RouteHP_View")
            .attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: async function () {
          try {
            var LoginFUnction = await this.commonLoginFunction("JobPosting");
            if (!LoginFUnction) return;

            // 🏷️ Initialize i18n
            this.i18na = this.getView().getModel("i18n")?.getResourceBundle();

            // 🏷️ Set validations
            this.validation = validation;

            // 🏷️ Set Header
            const i18nModel = this.getView()
              .getModel("i18n")
              .getResourceBundle();
            this.getView()
              .getModel("LoginModel")
              .setProperty("/HeaderName", i18nModel.getText("JobPosting"));

            // 🧹 Reset internal flags
            this._productDialog = null;
            this._isEdit = false;
            this._editIndex = null;

            // 📥 Load job data and setup models
            await this._fetchJobOpenings();
            await this._setBackendStatusModel();
            await this._getUniqueSkillsFromCandidates();
            this.closeBusyDialog();
          } catch (ererrorr) {
            this.closeBusyDialog();
            MessageToast.show(error.message || error.responseText);
          } finally {
            this.closeBusyDialog();
          }
        },

        onPressback: function () {
          this.getRouter().navTo("RouteTilePage"); // Navigate to tile page
        },

        onLogout: function () {
          this.CommonLogoutFunction(); // Navigate to login page
        },

        _updateDynamicFilters: function (aData) {
          const aSkills = aData
            .map((i) => i.PrimarySkills)
            .filter(Boolean)
            .flatMap((s) => s.split(",").map((skill) => skill.trim()))
            .filter(Boolean);

          const aUniqueSkills = [...new Set(aSkills)].map((skill) => ({
            skill,
          }));

          this.getView().setModel(
            new JSONModel({ skills: aUniqueSkills }),
            "skillModel"
          );
        },

        _fetchJobOpenings: async function () {
          try {
            this.getBusyDialog();

            const oResponse = await this.ajaxReadWithJQuery("JobOpenings");
            const aData = oResponse?.data || [];

            const oModel = new JSONModel({
              Candidates: aData,
            });
            this.getView().setModel(oModel, "JobApplicationModel");

            // 🔁 Refresh dependent models for filters
            this._getUniqueSkillsFromCandidates();
          } catch (err) {
            this.closeBusyDialog();
            MessageToast.show(this.getText?.("dataLoadError"));
          } finally {
            this.closeBusyDialog();
          }
        },

        _setStatusModel: function () {
          const oStatusModel = new JSONModel({
            statusOptions: [
              { key: "true", text: "Active" },
              { key: "false", text: "Inactive" },
            ],
          });
          this.getView().setModel(oStatusModel, "BackendStatusModel");
        },

        _getUniqueSkillsFromCandidates: function () {
          const oModel = this.getView().getModel("JobApplicationModel");
          const aCandidates = oModel?.getProperty("/Candidates") || [];

          const aSkills = aCandidates
            .map((c) => c.PrimarySkills?.split(",") || [])
            .flat()
            .map((skill) => skill.trim())
            .filter(Boolean);

          const aUniqueSkills = [...new Set(aSkills)].map((skill) => ({
            skill,
          }));

          const oSkillModel = new JSONModel({
            skills: aUniqueSkills,
          });
          this.getView().setModel(oSkillModel, "skillModel");
        },
        _setBackendStatusModel: function () {
          const oStatusModel = new JSONModel([
            { key: "true", text: "Active" },
            { key: "false", text: "Inactive" },
          ]);
          this.getView().setModel(oStatusModel, "BackendStatusModel");
        },

        _extractFilterOptions: function () {
          const aCandidates =
            this.getView()
              .getModel("JobApplicationModel")
              ?.getProperty("/Candidates") || [];

          // 📍 Location
          const aLocations = [
            ...new Set(
              aCandidates.map((o) => o.Location?.trim()).filter(Boolean)
            ),
          ].map((loc) => ({ key: loc, text: loc }));

          const oLocModel = new JSONModel({
            cities: aLocations,
          });
          this.getView().setModel(oLocModel, "BackendLocationModel");

          // 💼 Experience
          const aExperience = [
            ...new Set(
              aCandidates.map((o) => o.Experience?.trim()).filter(Boolean)
            ),
          ].map((exp) => ({ key: exp, text: exp }));

          const oExpModel = new JSONModel(aExperience);
          this.getView().setModel(oExpModel, "BackendExperienceModel");

          // ✅ Status
          const aStatus = [...new Set(aCandidates.map((o) => o.Status))].map(
            (stat) => ({
              key: stat?.toString(),
              text: stat ? "Active" : "Inactive",
            })
          );

          const oStatusModel = new JSONModel(aStatus);
          this.getView().setModel(oStatusModel, "BackendStatusModel");

          // 🧠 Primary Skills
          const aSkills = aCandidates
            .map((o) => o.PrimarySkills)
            .filter(Boolean)
            .flatMap((s) => s.split(","))
            .map((s) => s.trim())
            .filter(Boolean);

          const aUniqueSkills = [...new Set(aSkills)].map((skill) => ({
            skill,
          }));
          const oSkillModel = new JSONModel({
            skills: aUniqueSkills,
          });
          this.getView().setModel(oSkillModel, "skillModel");
        },

        _commonFragmentOpen: async function (
          oTempModel,
          fragmentPath,
          dialogId,
          datePickerIds = []
        ) {
          const oView = this.getView();

          if (!this._dialogMap) {
            this._dialogMap = {};
          }

          let oDialog = this._dialogMap[dialogId];

          if (!oDialog) {
            oDialog = await Fragment.load({
              id: oView.getId(),
              name: fragmentPath,
              controller: this,
            });

            this._dialogMap[dialogId] = oDialog;
            oView.addDependent(oDialog);
          }

          oDialog.setModel(oTempModel, "temporaryModel");

          // Set min/max range
          datePickerIds.forEach((id) => {
            const oDP = this.byId(id);
            if (oDP?.setMinDate && oDP?.setMaxDate) {
              const oToday = new Date();
              const oMinDate = new Date();
              oMinDate.setFullYear(oToday.getFullYear() - 20);
              oDP.setMinDate(oMinDate);
              oDP.setMaxDate(oToday);
            }
          });

          // Attach RTE change listeners
          const sFragId = oView.getId();
          ["secondarySkillsRTE", "jobDescRTE"].forEach((rteId) => {
            const oRTE = Fragment.byId(sFragId, rteId);
            if (oRTE) {
              oRTE.detachChange(this.onRichTextChange, this);
              oRTE.attachChange(this.onRichTextChange, this);
            }
          });

          oDialog.open();

          // ✅ Set DatePicker(s) readonly via DOM
          datePickerIds.forEach((id) => {
            const oDP = this.byId(id);
            if (oDP) {
              const $input = oDP.$().find("input");
              if ($input?.length > 0) {
                $input.attr("readonly", true);
              }
            }
          });
        },

        onOpenAddJobDialog: function () {
          const oView = this.getView();

          // Reset mode flags
          this._isEdit = false;
          this._editJobId = null;

          // Prepare empty job object
          const oTempModel = new JSONModel({
            dialogTitle: "Create Job Posting",
            JobTitle: "",
            JobDescription: "",
            KeyResponsibilities: "",
            PrimarySkills: "",
            SecondarySkills: "",
            SkillRequirements: "",
            Qualification: "",
            Experience: "",
            Certifications: "",
            SelectedLocation: "",
            SelectedWorkMode: "",
            NoOfPositions: "",
            PostDate: "",
            Status: "true",
            isEdit: false,
          });

          oView.setModel(oTempModel, "temporaryModel");
          console.log("oTempModel", oTempModel.getData());

          this._commonFragmentOpen(
            oTempModel,
            "sap.kt.com.minihrsolution.fragment.AddEditJob",
            "addJobDialog",
            ["postDateDP"]
          );
        },

        onOpenEditJobDialog: function () {
          const oView = this.getView();
          const oTable = this.byId("jobPostingTable");
          const oSelectedItem = oTable.getSelectedItem();

          if (!oSelectedItem) {
            MessageToast.show("Please select a row to edit");
            return;
          }

          const oContext = oSelectedItem.getBindingContext(
            "JobApplicationModel"
          );
          const oData = oContext.getObject();
          console.log("Selected Edit Data:", oData);

          this._isEdit = true;
          this._editJobId = oData.ID || "";

          const aLocations =
            this.getView().getModel("BaseLocationModel")?.getProperty("/") ||
            [];
          const matchingLocation = aLocations.find(
            (loc) => loc.city === oData.Location
          );
          const selectedLocationId = matchingLocation?.id || "";
          const workingModes =
            this.getView().getModel("WorkingMode")?.getProperty("/location") ||
            [];
          const matchedWorkMode = workingModes.find(
            (mode) => mode.Location === oData.LocationService
          );
          const selectedWorkModeId = matchedWorkMode?.ID || "";

          const oTempModel = new JSONModel({
            dialogTitle: "Edit Post — " + (oData.JobTitle || ""),
            SelectedJobTitleKey: oData.JobTitle || "",
            SelectedQualificationKey: oData.Qualification || "",
            SelectedExperienceKey: oData.Experience || "",
            SelectedLocation: selectedLocationId,
            JobDescription: oData.JobDescription || "",
            KeyResponsibilities: oData.KeyResponsibilities || "",
            PrimarySkills: oData.PrimarySkills || "",
            SecondarySkills: oData.SecondarySkills || "",
            SkillRequirements: oData.SkillRequirements || "",
            Certifications: oData.Certifications || "",
            SelectedWorkMode: selectedWorkModeId,
            NoOfPositions: oData.NoOfPositions || "",
            PostDate: oData.PostDate ? oData.PostDate.split("T")[0] : "",
            Status: oData.Status || "false",
            isEdit: true,
          });

          console.log("Temporary Model Data:", oTempModel.getData());

          oView.setModel(oTempModel, "temporaryModel");

          this._commonFragmentOpen(
            oTempModel,
            "sap.kt.com.minihrsolution.fragment.AddEditJob",
            "addJobDialog",
            ["postDateDP"]
          );
        },

        onCloseDialog: function () {
          const oView = this.getView();
          const oDialog = this.byId("addJobDialog");

          if (!oDialog) {
            console.warn("Dialog not found");
            return;
          }

          const aFieldIds = [
            "JobTitleCombo",
            "primarySkillsInput",
            "qualificationComb",
            "experienceCombo",
            "certificationsInput",
            "idlocationcombo",
            "positionsInput",
            "postDateDP",
            "jobDescRTE",
            "workModeCombo",
            "keyRespRTE",
            "secondarySkillsRTE",
            "skillReqRTE",
          ];

          aFieldIds.forEach((sId) => {
            const oControl = oView.byId(sId);
            if (!oControl) return;

            if (oControl.setValueState) oControl.setValueState("None");
            if (oControl.removeStyleClass)
              oControl.removeStyleClass("rteError");

            if (typeof oControl.setValue === "function") {
              oControl.setValue("");
            } else if (typeof oControl.setSelectedKey === "function") {
              oControl.setSelectedKey("");
            }
          });

          oView.setModel(null, "temporaryModel");
          oDialog.close();
          this.byId("jobPostingTable").removeSelections(true);
          this.onJobSelectionChange();
        },

        onRichTextChange: function (oEvent) {
          const oRTE = oEvent.getSource();
          const sLabel = this._getRTELabel(oRTE.getId());
          const sValue = oRTE.getValue();
          const sPlain = sValue
            ?.replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, "")
            .trim();

          const oDomRef = oRTE.getDomRef?.() || oRTE.getContentDomRef?.();

          if (!sPlain) {
            if (oDomRef && !oDomRef.classList.contains("sapUiRTEErrorBorder")) {
              oDomRef.classList.add("sapUiRTEErrorBorder");
              MessageToast.show(`${sLabel} is required.`);
            }
          } else {
            if (oDomRef?.classList.contains("sapUiRTEErrorBorder")) {
              oDomRef.classList.remove("sapUiRTEErrorBorder");
            }
          }
        },

        _getRTELabel: function (rteId) {
          if (rteId.includes("secondarySkillsRTE")) return "Secondary Skills";
          if (rteId.includes("jobDescRTE")) return "Job Description";
          return "This field";
        },

        getText: function (sKey, aArgs = []) {
          return this.getView()
            .getModel("i18n")
            .getResourceBundle()
            .getText(sKey, aArgs);
        },

        onSubmitJob: async function () {
          const oPayload = this._prepareJobPayload();
          if (!oPayload) return;

          this.getBusyDialog();
          try {
            if (this._isEdit && this._editJobId) {
              await this.ajaxUpdateWithJQuery("JobOpenings", {
                data: oPayload,
                filters: { ID: this._editJobId },
              });
              MessageToast.show(this.getText("jobUpdateSuccess"));
            } else {
              await this.ajaxCreateWithJQuery("JobOpenings", {
                data: [oPayload],
              });
              MessageToast.show(this.getText("jobCreateSuccess"));
            }
            this._fetchJobOpenings();
            this.onJobSelectionChange();
            this.onCloseDialog();
          } catch (e) {
            MessageToast.show(this.getText("saveJobError"));
          } finally {
            this.closeBusyDialog();
          }
        },

        _prepareJobPayload: function () {
          if (!this._validateJobPostingFields()) return null;
          const oData = this.getView().getModel("temporaryModel").getData();
          return {
            jobTitle: oData.SelectedJobTitleKey,
            jobDescription: oData.JobDescription,
            keyResponsibilities: oData.KeyResponsibilities || "",
            primarySkills: oData.PrimarySkills,
            secondarySkills: oData.SecondarySkills,
            skillRequirements: oData.SkillRequirements || "",
            qualification: oData.SelectedQualificationKey,
            experience: oData.SelectedExperienceKey,
            certifications: oData.Certifications || "",
            location: this.byId("idlocationcombo")?.getValue()?.trim(),
            LocationService:
              this.byId("workModeCombo")?.getSelectedItem()?.getText() || "",
            NoOfPositions: parseInt(oData.NoOfPositions, 10) || 0,
            postDate: oData.PostDate,
            Status: oData.Status,
          };
        },

        _validateJobPostingFields: function () {
          const oView = this.getView();
          const validation = this.validation;
          const fieldLabels = {
            idlocationcombo: "Location",
            workModeCombo: "Work Mode",
            positionsInput: "Number of Positions",
            postDateDP: "Post Date",
            primarySkillsInput: "Primary Skills",
            experienceCombo: "Experience",
            qualificationComb: "Qualification",
            JobTitleCombo: "Job Title",
          };

          const scrollToControl = (oCtrl) => {
            const oDom = oCtrl?.getDomRef?.() || oCtrl?.getContentDomRef?.();
            if (oDom?.scrollIntoView) {
              oDom.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          };

          const validateField = (id, validatorFn) => {
            const oCtrl = oView.byId(id);
            if (!oCtrl) return true;

            const isValid = validatorFn(oCtrl, "ID");
            if (!isValid) {
              oCtrl.setValueState("Error");
              oCtrl.setValueStateText(`${fieldLabels[id]} is required`);
              scrollToControl(oCtrl);
              oCtrl.focus?.();
              MessageToast.show(this.getText("mandetoryFields"));
              return false;
            } else {
              oCtrl.setValueState("None");
              return true;
            }
          };

          // 1️⃣ First 4 common fields
          const firstFields = [
            { id: "idlocationcombo", validator: validation._LCvalidateName },
            {
              id: "workModeCombo",
              validator: validation._LCstrictValidationComboBox,
            },
            {
              id: "positionsInput",
              validator: validation._LCvalidateAmountZeroTaking,
            },
            {
              id: "postDateDP",
              validator: validation._LCvalidateMandatoryField,
            },

            {
              id: "primarySkillsInput",
              validator: validation._LCvalidateMandatoryField,
            },
          ];
          for (const field of firstFields) {
            if (!validateField(field.id, field.validator)) return false;
          }

          // 2️⃣ Validate SecondarySkills RTE
          const oSecRTE = Fragment.byId(oView.getId(), "secondarySkillsRTE");
          const sSecPlain = oSecRTE
            ?.getValue()
            ?.replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, "")
            .trim();
          const oSecDom =
            oSecRTE?.getDomRef?.() || oSecRTE?.getContentDomRef?.();
          if (!sSecPlain) {
            oSecDom?.classList.add("sapUiRTEErrorBorder");
            scrollToControl(oSecRTE);
            oSecRTE?.focus?.();
            //   MessageToast.show(this.getText("mandetoryFields"));
            return false;
          } else {
            oSecDom?.classList.remove("sapUiRTEErrorBorder");
          }

          // 3️⃣ Next 3 ComboBoxes
          const nextFields = [
            {
              id: "experienceCombo",
              validator: validation._LCstrictValidationComboBox,
            },
            {
              id: "qualificationComb",
              validator: validation._LCstrictValidationComboBox,
            },
            {
              id: "JobTitleCombo",
              validator: validation._LCstrictValidationComboBox,
            },
          ];
          for (const field of nextFields) {
            if (!validateField(field.id, field.validator)) return false;
          }

          // 4️⃣ Validate JobDescription RTE
          const oJobDescRTE = Fragment.byId(oView.getId(), "jobDescRTE");
          const sDescPlain = oJobDescRTE
            ?.getValue()
            ?.replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, "")
            .trim();
          const oDescDom =
            oJobDescRTE?.getDomRef?.() || oJobDescRTE?.getContentDomRef?.();
          if (!sDescPlain) {
            oDescDom?.classList.add("sapUiRTEErrorBorder");
            scrollToControl(oJobDescRTE);
            oJobDescRTE?.focus?.();
            MessageToast.show(this.getText("mandetoryFields"));

            return false;
          } else {
            oDescDom?.classList.remove("sapUiRTEErrorBorder");
          }

          return true;
        },

        _setDatePickerRange: function () {
          const oDatePicker = this.byId("postDateDP");
          if (oDatePicker) {
            const oToday = new Date();
            const oMinDate = new Date();
            oMinDate.setFullYear(oToday.getFullYear() - 20);
            oDatePicker.setMinDate(oMinDate);
            oDatePicker.setMaxDate(oToday);
          }
        },

        onDeleteJob: function () {
          const oTable = this.byId("jobPostingTable");
          const aSelectedItems = oTable.getSelectedItems();

          if (aSelectedItems.length === 0) {
            MessageToast.show("Please select a job posting to delete");
            return;
          }

          const oSelectedItem = aSelectedItems[0];
          const oContext = oSelectedItem.getBindingContext(
            "JobApplicationModel"
          );
          const oJobData = oContext?.getObject?.() || {};

          if (!oJobData.ID) {
            MessageToast.show("Selected item has no valid ID for deletion.");
            console.error("Missing ID in Job Data:", oJobData);
            return;
          }

          const sPayload = { filters: { ID: oJobData.ID } };

          this.showConfirmationDialog(
            this.i18na.getText("confirmTitle") || "Confirm Deletion",
            this.i18na.getText("DeleteJPMessage"),
            async () => {
              this.getBusyDialog();
              try {
                console.log("📦 Deletion Payload:", sPayload);
                await this.ajaxDeleteWithJQuery("JobOpenings", sPayload);
                MessageToast.show(this.i18na.getText("DeleteJPSucces"));
                this._fetchJobOpenings();
                oTable.removeSelections(true);
                this.onJobSelectionChange();
              } catch (error) {
                console.error("❌ Deletion failed:", error);
                MessageToast.show(
                  "Failed to delete job: " +
                    (error?.responseJSON?.message ||
                      "Please check backend logs")
                );
              } finally {
                this.closeBusyDialog();
              }
            },
            () => {
              oTable.removeSelections(true);
              this.onJobSelectionChange(); // ⛔ disables Delete button
            }
          );
        },

        onNoOfPositionsChange: function (oEvent) {
          const oInput = oEvent.getSource();
          let sValue = oInput.getValue();

          // Step 1: Remove non-digit characters
          sValue = sValue.replace(/\D/g, "");

          // Step 2: Remove leading zeros
          sValue = sValue.replace(/^0+/, "");

          // Step 3: Limit to 2 digits
          if (sValue.length > 2) {
            sValue = sValue.substring(0, 2);
          }

          // Step 4: Validate final value
          const iValue = parseInt(sValue, 10);
          if (!iValue || iValue < 1 || iValue > 99) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
              "Number of Positions Required\nEnter a number between 1 and 99 (no leading zero)."
            );
          } else {
            oInput.setValueState("None");
          }

          // Step 5: Set corrected value
          oInput.setValue(sValue);
        },

        onPostDateChange: function (oEvent) {
          const oDatePicker = oEvent.getSource();
          const oDate = oDatePicker.getDateValue();
          const oToday = new Date();
          const oMinDate = new Date();
          oMinDate.setFullYear(oToday.getFullYear() - 20);

          // 🛑 1. Empty or invalid input check (keyboard nonsense, blank)
          if (!oDate || isNaN(oDate.getTime())) {
            oDatePicker.setValueState("Error");
            oDatePicker.setValueStateText("Please select a valid date");
          }
          // 🛑 2. Range check
          else if (oDate < oMinDate || oDate > oToday) {
            oDatePicker.setValueState("Error");
            oDatePicker.setValueStateText(
              "Date must be within the last 20 years and not in the future"
            );
          }
          // ✅ Valid date
          else {
            oDatePicker.setValueState("None");
          }

          // 🛡 3. Always block typing manually
          // (Ensures even after re-binding it's enforced again)
          setTimeout(() => {
            oDatePicker.$().find("input").attr("readonly", true);
          }, 0);
        },
        onPrimarySkillsChange: function (oEvent) {
          const oInput = oEvent.getSource();
          const sValue = oEvent.getParameter("value")?.trim();

          if (!sValue) {
            oInput.setValueState("Error");
            oInput.setValueStateText("Primary Skills are required.");
            return;
          }

          if (sValue.length > 50) {
            oInput.setValueState("Error");
            oInput.setValueStateText("Maximum 50 characters allowed.");
            return;
          }

          const validSkillRegex = /^(?!\d+$)[A-Za-z0-9 +#.\-,]+$/;

          // Split by comma and validate each skill
          const skillsArray = sValue
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          const bAllValid = skillsArray.every((skill) =>
            validSkillRegex.test(skill)
          );

          if (!bAllValid) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
              "Only letters, alphanumerics, spaces and + # . - , are allowed."
            );
          } else {
            oInput.setValueState("None");
          }
        },

        onCertificationChange: function (oEvent) {
          const oInput = oEvent.getSource();
          const sValue = oEvent.getParameter("value")?.trim();

          if (sValue.length > 50) {
            oInput.setValueState("Error");
            oInput.setValueStateText("Maximum 50 characters allowed.");
            return;
          }

          const validSkillRegex = /^(?!\d+$)[A-Za-z0-9 +#.\-,]+$/;

          // Split by comma and validate each skill
          const skillsArray = sValue
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          const bAllValid = skillsArray.every((skill) =>
            validSkillRegex.test(skill)
          );

          if (!bAllValid) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
              "Only letters, alphanumerics, spaces and + # . - , are allowed."
            );
          } else {
            oInput.setValueState("None");
          }
        },

        _isValidCertificationsInput: function (sValue) {
          if (!sValue || sValue.trim() === "") {
            return true; // Certifications are optional
          }

          const skillsArray = sValue
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          const hasDuplicates =
            new Set(skillsArray).size !== skillsArray.length;

          const validSkillRegex = /^(?!\d+$)[A-Za-z0-9 +#.\-]+$/;
          const allSkillsValid = skillsArray.every((skill) =>
            validSkillRegex.test(skill)
          );

          return !hasDuplicates && allSkillsValid && sValue.length <= 50;
        },
        onRTESecSkillChange: function (oEvent) {
          const oEditor = oEvent.getSource();
          const sHTML = oEditor.getValue();

          const sText = sHTML
            .replace(/<[^>]*>/g, "") // Remove HTML tags
            .replace(/&nbsp;/g, "") // Remove non-breaking spaces
            .replace(/\s+/g, ""); // Remove all whitespace

          if (!sText) {
            oEditor.setValueState("Error");
            oEditor.setValueStateText("This field is required");
          } else {
            oEditor.setValueState("None");
          }
        },

        onFilterSearch: async function () {
          const oView = this.getView();
          const aFilterItems =
            this.byId("filterBar")?.getFilterGroupItems() || [];

          const oFilterPayload = {
            PrimarySkills: "",
            Experience: "",
            Location: "",
            Status: "",
          };

          // 🔄 Extract filter values
          aFilterItems.forEach((oItem) => {
            const sFieldName = oItem.getName(); // "Skills", "Experience", etc.
            const oControl = oItem.getControl();
            if (!oControl) return;

            switch (sFieldName) {
              case "Skills":
                oFilterPayload.PrimarySkills =
                  oControl.getValue()?.trim() || "";
                break;

              case "Experience": {
                const oSelectedItem = oControl.getSelectedItem();
                const sExpVal = oSelectedItem
                  ?.getBindingContext("ExperienceModel")
                  ?.getObject()?.value;
                oFilterPayload.Experience = sExpVal || "";
                break;
              }

              case "Location": {
                const sLocKey = oControl.getSelectedKey();
                if (sLocKey) {
                  const aLocations =
                    this.getView().getModel("BaseLocationModel")?.getData() ||
                    [];
                  const oLoc = aLocations.find((loc) => loc.id === sLocKey);
                  oFilterPayload.Location = oLoc?.city || "";
                }
                break;
              }

              case "Status":
                oFilterPayload.Status = oControl.getSelectedKey() || "";
                break;
            }
          });

          // ⛔ No filters? Load full data
          const bEmpty = Object.values(oFilterPayload).every((val) => !val);
          if (bEmpty) {
            this._fetchJobOpenings(); // Load original dataset
            this._setBackendStatusModel(); // Refresh dropdowns if needed
            return;
          }

          try {
            this.getBusyDialog();

            const oResponse = await this.ajaxReadWithJQuery(
              "JobOpenings",
              oFilterPayload
            );
            const aData = oResponse?.data || [];
            // 👇 Add this condition
            if (aData.length === 0) {
              MessageToast.show(
                this.getText("noMatchingResults") ||
                  "No matching records found."
              );
            }

            oView.setModel(
              new JSONModel({ Candidates: aData }),
              "JobApplicationModel"
            );
          } catch (err) {
            this.showMessage(
              "fetchError",
              "❌ " + (err?.responseJSON?.message || err?.message)
            );
          } finally {
            this.closeBusyDialog();
          }
        },

        onSuggestSkills: function (oEvent) {
          const sValue =
            oEvent.getParameter("suggestValue")?.toLowerCase() || "";

          const aTableData =
            this.getView()
              .getModel("JobApplicationModel")
              ?.getProperty("/Candidates") || [];

          // 🔍 Flatten and extract all skills
          const aMatchedSkills = aTableData
            .map((item) => item.PrimarySkills?.split(",") || [])
            .flat()
            .map((skill) => skill.trim())
            .filter((skill) => skill.toLowerCase().includes(sValue));

          // 🧼 Remove duplicates
          const aUniqueSkills = [...new Set(aMatchedSkills)];

          // 📦 Convert to suggestion item format
          const aSuggestionItems = aUniqueSkills.map((skill) => ({ skill }));

          // 🔁 Bind to model
          const oSuggestModel = new JSONModel({
            skills: aSuggestionItems,
          });
          this.getView().setModel(oSuggestModel, "skillModel");
        },

        v1_filClear: function () {
          this.byId("filterLocation").setSelectedKey("");
          this.byId("filterExperienceJP").setSelectedKey("");
          this.byId("filterStatus").setSelectedKey("");
          this.byId("filterPrimarySkills").setValue("");
        },
        onJobSelectionChange: function () {
          var aSelectedItems = this.byId("jobPostingTable").getSelectedItems();
          if (aSelectedItems.length > 0) {
            this.byId("HP_id_create").setEnabled(false);
            this.byId("HP_id_edit").setEnabled(true);
            this.byId("HP_id_delete").setEnabled(true);
          } else {
            this.byId("HP_id_create").setEnabled(true);
            this.byId("HP_id_edit").setEnabled(true);
            this.byId("HP_id_delete").setEnabled(true);
          }
        },

        onStatusChange: function (oEvent) {
          this.validation._LCstrictValidationComboBox(oEvent);
        },

        onLocationChange: function (oEvent) {
          this.validation._LCstrictValidationComboBox(oEvent);
        },
        onWorkModeChange: function (oEvent) {
          this.validation._LCstrictValidationComboBox(oEvent);
        },

        onExperienceChange: function (oEvent) {
          this.validation._LCstrictValidationComboBox(oEvent);
        },

        onQualificationChange: function (oEvent) {
          this.validation._LCstrictValidationComboBox(oEvent);
        },

        onJobTitleChange: function (oEvent) {
          this.validation._LCstrictValidationComboBox(oEvent);
        },
      }
    );
  }
);
