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

          const router = this.getOwnerComponent().getRouter();
          router
            .getRoute("RouteHP_View")
            .attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: async function () {
          try {
            this.getBusyDialog();

            //  Login check
            const bLoginSuccess = await this.commonLoginFunction("JobPosting");
            if (!bLoginSuccess) {
              this.closeBusyDialog();
              return;
            }

            //  i18n + validation init
            this.i18na = this.getView().getModel("i18n")?.getResourceBundle();
            this.validation = validation;

            //  Set Header Name using i18n
            const sHeaderText = this.i18na.getText("JobPosting");
            this.getView()
              .getModel("LoginModel")
              .setProperty("/HeaderName", sHeaderText);

            // Reset controller state
            this._productDialog = null;
            this._isEdit = false;
            this._editIndex = null;

            // Load backend data
            await this._fetchJobOpenings();
            await this._setBackendStatusModel();
            await this._getUniqueSkillsFromCandidates();
          } catch (error) {
            // Proper error capture
            MessageToast.show(
              error?.message || error?.responseText || "Unknown error occurred."
            );
          } finally {
            this.closeBusyDialog(); // Ensure dialog is closed in all cases
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

            //  Refresh dependent models for filters
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

          // Location
          const aLocations = [
            ...new Set(
              aCandidates.map((o) => o.Location?.trim()).filter(Boolean)
            ),
          ].map((loc) => ({ key: loc, text: loc }));

          const oLocModel = new JSONModel({
            cities: aLocations,
          });
          this.getView().setModel(oLocModel, "BackendLocationModel");

          // Experience
          const aExperience = [
            ...new Set(
              aCandidates.map((o) => o.Experience?.trim()).filter(Boolean)
            ),
          ].map((exp) => ({ key: exp, text: exp }));

          const oExpModel = new JSONModel(aExperience);
          this.getView().setModel(oExpModel, "BackendExperienceModel");

          //  Status
          const aStatus = [...new Set(aCandidates.map((o) => o.Status))].map(
            (stat) => ({
              key: stat?.toString(),
              text: stat ? "Active" : "Inactive",
            })
          );

          const oStatusModel = new JSONModel(aStatus);
          this.getView().setModel(oStatusModel, "BackendStatusModel");

          //  Primary Skills
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

            oView.addDependent(oDialog);
            this._dialogMap[dialogId] = oDialog;
          }

          //  Bind model before opening
          oDialog.setModel(oTempModel, "temporaryModel");

          // Set min/max range for DatePickers
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

          // Attach Rich Text Editor change events
          const sFragId = oView.getId();
          ["secondarySkillsRTE", "jobDescRTE"].forEach((rteId) => {
            const oRTE = Fragment.byId(sFragId, rteId);
            if (oRTE) {
              oRTE.detachChange(this.onRichTextChange, this);
              oRTE.attachChange(this.onRichTextChange, this);
            }
          });

          // Set DatePickers readonly
          datePickerIds.forEach((id) => {
            const oDP = this.byId(id);
            if (oDP) {
              const $input = oDP.$().find("input");
              if ($input?.length > 0) {
                $input.attr("readonly", true);
              }
            }
          });

          oDialog.open();
        },

        onOpenAddJobDialog: function () {
          const oView = this.getView();

          this._isEdit = false;
          this._editJobId = null;

          this.getBusyDialog(); //

          const oTempModel = new JSONModel({
            dialogTitle: "Create Job Posting",
            SelectedJobTitleKey: "",
            qualifications: [],
            SelectedExperienceKey: "",
            SelectedLocation: "",
            JobDescription: "",
            KeyResponsibilities: "",
            PrimarySkills: "",
            SecondarySkills: "",
            SkillRequirements: "",
            Certifications: "",
            SelectedWorkMode: "",
            NoOfPositions: "",
            PostDate: "",
            Status: "true",
            isEdit: false,
          });

          oView.setModel(oTempModel, "temporaryModel");

          this._openJobDialog(oTempModel)
            .catch((err) => {})
            .finally(() => {
              this.closeBusyDialog();
            });
        },

        onOpenEditJobDialog: function () {
          const oView = this.getView();
          const oTable = this.byId("jobPostingTable");
          const oSelectedItem = oTable.getSelectedItem();

          if (!oSelectedItem) {
            MessageToast.show("Please select a row to edit");
            return;
          }

          this.getBusyDialog();

          const oContext = oSelectedItem.getBindingContext(
            "JobApplicationModel"
          );
          const oData = oContext.getObject();

          this._isEdit = true;
          this._editJobId = oData.ID || "";

          const aQualifications = (oData.Qualification || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          const aLocations =
            oView.getModel("BaseLocationModel")?.getProperty("/") || [];
          const selectedLocationId =
            aLocations.find((loc) => loc.city === oData.Location)?.id || "";

          const workingModes =
            oView.getModel("WorkingMode")?.getProperty("/location") || [];
          const selectedWorkModeId =
            workingModes.find((mode) => mode.Location === oData.LocationService)
              ?.ID || "";

          const oTempModel = new JSONModel({
            dialogTitle: `Edit Post — ${oData.JobTitle || ""}`,
            SelectedJobTitleKey: oData.JobTitle || "",
            qualifications: aQualifications,
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
            PostDate: (oData.PostDate || "").split("T")[0] || "",
            Status: oData.Status || "false",
            isEdit: true,
          });

          oView.setModel(oTempModel, "temporaryModel");

          this._openJobDialog(oTempModel)
            .catch((err) => {})
            .finally(() => {
              this.closeBusyDialog();
            });
        },

        _openJobDialog: function (oTempModel) {
          return this._commonFragmentOpen(
            oTempModel,
            "sap.kt.com.minihrsolution.fragment.AddEditJob",
            "addJobDialog",
            ["postDateDP"]
          ).then(() => {
            const oMultiInput = this.byId("multiInputQualifications");
            if (oMultiInput) {
              oMultiInput.removeAllTokens();
              const aQualifications =
                oTempModel.getProperty("/qualifications") || [];
              aQualifications.forEach((q) =>
                oMultiInput.addToken(new sap.m.Token({ text: q, key: q }))
              );
            }
          });
        },

        onQualificationsTokenUpdate: function (oEvent) {
          const oInput = oEvent.getSource();
          const oModel = this.getView().getModel("temporaryModel");

          const aCurrent = oModel.getProperty("/qualifications") || [];
          const aRemoved = oEvent.getParameter("removedTokens") || [];
          const aAdded = oEvent.getParameter("addedTokens") || [];

          // Handle removals
          if (aRemoved.length > 0) {
            const aRemovedTexts = aRemoved.map((oToken) => oToken.getText());
            const aUpdated = aCurrent.filter((q) => !aRemovedTexts.includes(q));
            oModel.setProperty("/qualifications", aUpdated);
          }

          // Handle additions
          if (aAdded.length > 0) {
            const aAddedTexts = aAdded.map((oToken) => oToken.getText());
            const aUpdated = aCurrent.concat(aAddedTexts);
            oModel.setProperty("/qualifications", aUpdated);
          }

          // Always validate after change (whether added or removed)
          setTimeout(() => {
            const aTokens = oInput.getTokens();
            if (aTokens.length === 0) {
              oInput.setValueState("Error");
              oInput.setValueStateText(
                "At least one qualification is required."
              );
            } else {
              oInput.setValueState("None");
              oInput.setValueStateText("");
            }
          }, 0);
        },

        onCloseDialog: function () {
          const oView = this.getView();
          const oDialog = this.byId("addJobDialog");

          if (!oDialog) {
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
            } else if (oControl.removeAllTokens) {
              oControl.removeAllTokens();
            }
          });

          // Specific fix for qualifications MultiInput error state
          const oQualMultiInput = this.byId("multiInputQualifications");
          if (oQualMultiInput) {
            oQualMultiInput.setValueState("None");
            oQualMultiInput.setValueStateText("");
          }

          // Reset model data instead of nullifying the model
          const oTempModel = oView.getModel("temporaryModel");
          if (oTempModel) {
            oTempModel.setData({
              JobTitle: "",
              primarySkills: "",
              qualifications: [],
              experience: "",
              certifications: "",
              location: "",
              positions: "",
              postDate: null,
              jobDescription: "",
              workMode: "",
              keyResponsibilities: "",
              secondarySkills: "",
              skillRequirements: "",
              dialogTitle: "Create Job Posting",
            });
          }

          oDialog.close();
          this.byId("jobPostingTable").removeSelections(true);
          this.onJobSelectionChange();
        },

        onQualificationsChange: function (oEvent) {
          const oInput = oEvent.getSource();
          const sValue = oInput.getValue();

          if (sValue && sValue.trim() !== "") {
            // Clear manual typing instantly
            oInput.setValue("");
            this.utils.validation.setError(oInput, "Select from dialog only.");
          } else {
            // Re-validate via strict token check
            this.utils.validation._strictValidationMultiInput(
              oInput,
              "At least one qualification is required."
            );
          }
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

          this.getBusyDialog(); //

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

            await this._fetchJobOpenings();

            this.onJobSelectionChange();
            this._cleanupDialogAfterSubmit();
            this.onCloseDialog();
          } catch (error) {
            const errorText =
              error?.responseJSON?.error?.message ||
              error?.message ||
              this.getText("jobSubmitError");
            MessageToast.show(errorText);
          } finally {
            this.closeBusyDialog();
          }
        },

        _cleanupDialogAfterSubmit: function () {
          const oView = this.getView();

          // Close dialog if open
          const oDialog = oView.byId("addJobDialog");
          if (oDialog && oDialog.isOpen()) {
            oDialog.close();
          }

          // Reset model first to avoid side effects
          const oTempModel = oView.getModel("temporaryModel");
          if (oTempModel) {
            oTempModel.setData({});
          }

          // Remove qualification tokens safely
          const oMultiInput = oView.byId("multiInputQualifications");
          if (oMultiInput) {
            oMultiInput.removeAllTokens();
          }

          // Clear all input/select fields
          const aFieldIds = [
            "JobTitleCombo",
            "primarySkillsInput",
            "experienceCombo",
            "certificationsInput",
            "idlocationcombo",
            "positionsInput",
            "postDateDP",
            "workModeCombo",
          ];

          aFieldIds.forEach((sId) => {
            const oControl = oView.byId(sId);
            if (!oControl) return;

            if (typeof oControl.setValue === "function") {
              oControl.setValue("");
            } else if (typeof oControl.setSelectedKey === "function") {
              oControl.setSelectedKey("");
            } else if (typeof oControl.removeAllTokens === "function") {
              oControl.removeAllTokens();
            }

            if (typeof oControl.setValueState === "function") {
              oControl.setValueState("None");
            }
          });

          // Reset internal state
          this._isEdit = false;
          this._editJobId = null;
        },
        _validateJobPostingFields: function () {
          const oView = this.getView();
          const validation = this.validation;
          const that = this;

          const isEditMode = this._isEdit;

          const fieldLabels = {
            idlocationcombo: "Location",
            workModeCombo: "Work Mode",
            positionsInput: "Number of Positions",
            postDateDP: "Post Date",
            primarySkillsInput: "Primary Skills",
            experienceCombo: "Experience",
            multiInputQualifications: "Qualification",
            JobTitleCombo: "Job Title",
            ...(isEditMode && { statusCombo: "Status" }),
          };

          // Smooth scroll helper
          const scrollAndToast = (oCtrl, fieldName) => {
            setTimeout(() => {
              try {
                const oDom =
                  oCtrl?.getFocusDomRef?.() ||
                  oCtrl?.getDomRef?.() ||
                  oCtrl?.getContentDomRef?.();
                if (oDom?.scrollIntoView) {
                  oDom.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "nearest",
                  });
                }
                oCtrl.focus?.();
              } catch (e) {}
              MessageToast.show(
                that.getText("mandetoryFields") + `: ${fieldName}`
              );
            }, 50);
          };

          const validateField = (id, validatorFn) => {
            const oCtrl = oView.byId(id);
            if (!oCtrl) return true;

            const isValid = validatorFn(oCtrl, "ID");
            if (!isValid) {
              oCtrl.setValueState("Error");
              oCtrl.setValueStateText(`${fieldLabels[id]} is required`);
              scrollAndToast(oCtrl, fieldLabels[id]);
              return false;
            }
            oCtrl.setValueState("None");
            return true;
          };

          const fieldsToValidate = [
            ...(isEditMode
              ? [
                  {
                    id: "statusCombo",
                    validator: validation._LCstrictValidationComboBox,
                  },
                ]
              : []),
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

          for (const field of fieldsToValidate) {
            if (!validateField(field.id, field.validator)) return false;
          }

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
            scrollAndToast(oSecRTE, "Secondary Skills");
            return false;
          } else {
            oSecDom?.classList.remove("sapUiRTEErrorBorder");
          }

          // ComboBoxes + MultiInput
          const nextFields = [
            {
              id: "experienceCombo",
              validator: validation._LCstrictValidationComboBox,
            },
            {
              id: "multiInputQualifications",
              validator: function (oCtrl) {
                const aTokens = oCtrl.getTokens?.() || [];
                return aTokens.length > 0;
              },
            },
            {
              id: "JobTitleCombo",
              validator: validation._LCstrictValidationComboBox,
            },
          ];

          for (const field of nextFields) {
            if (!validateField(field.id, field.validator)) return false;
          }

          // JobDescription RTE
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
            scrollAndToast(oJobDescRTE, "Job Description");
            return false;
          } else {
            oDescDom?.classList.remove("sapUiRTEErrorBorder");
          }

          return true;
        },

        _prepareJobPayload: function () {
          if (!this._validateJobPostingFields()) return null;

          const oData = this.getView().getModel("temporaryModel").getData();
          const sUserName = this.getOwnerComponent()
            .getModel("LoginModel")
            .getProperty("/EmployeeName");
          const sUserID = this.getOwnerComponent()
            .getModel("LoginModel")
            .getProperty("/EmployeeID");

          return {
            jobTitle: oData.SelectedJobTitleKey,
            jobDescription: oData.JobDescription,
            keyResponsibilities: oData.KeyResponsibilities || "",
            primarySkills: oData.PrimarySkills,
            secondarySkills: oData.SecondarySkills,
            skillRequirements: oData.SkillRequirements || "",
            // qualification: oData.SelectedQualificationKey,
            qualification: (oData.qualifications || []).join(", "),
            experience: oData.SelectedExperienceKey,
            certifications: oData.Certifications || "",
            location: this.byId("idlocationcombo")?.getValue()?.trim(),
            LocationService:
              this.byId("workModeCombo")?.getSelectedItem()?.getText() || "",
            NoOfPositions: parseInt(oData.NoOfPositions, 10) || 0,
            postDate: oData.PostDate,
            Status: oData.Status,
            CreatedBy: `${sUserName} (${sUserID})`,
          };
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
            return;
          }

          const sPayload = { filters: { ID: oJobData.ID } };

          this.showConfirmationDialog(
            this.i18na.getText("confirmTitle") || "Confirm Deletion",
            this.i18na.getText("DeleteJPMessage"),
            async () => {
              this.getBusyDialog();
              try {
                await this.ajaxDeleteWithJQuery("JobOpenings", sPayload);
                MessageToast.show(this.i18na.getText("DeleteJPSucces"));
                this._fetchJobOpenings();
                oTable.removeSelections(true);
                this.onJobSelectionChange();
              } catch (error) {
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
              this.onJobSelectionChange();
            }
          );
        },

        onNoOfPositionsChange: function (oEvent) {
          const oInput = oEvent.getSource();
          let sValue = oInput.getValue();

          sValue = sValue.replace(/\D/g, "");

          sValue = sValue.replace(/^0+/, "");

          if (sValue.length > 2) {
            sValue = sValue.substring(0, 2);
          }

          const iValue = parseInt(sValue, 10);
          if (!iValue || iValue < 1 || iValue > 99) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
              "Number of Positions Required\nEnter a number between 1 and 99 (no leading zero)."
            );
          } else {
            oInput.setValueState("None");
          }

          oInput.setValue(sValue);
        },

        onPostDateChange: function (oEvent) {
          const oDatePicker = oEvent.getSource();
          const oDate = oDatePicker.getDateValue();
          const oToday = new Date();
          const oMinDate = new Date();
          oMinDate.setFullYear(oToday.getFullYear() - 20);

          if (!oDate || isNaN(oDate.getTime())) {
            oDatePicker.setValueState("Error");
            oDatePicker.setValueStateText("Please select a valid date");
          } else if (oDate < oMinDate || oDate > oToday) {
            oDatePicker.setValueState("Error");
            oDatePicker.setValueStateText(
              "Date must be within the last 20 years and not in the future"
            );
          } else {
            oDatePicker.setValueState("None");
          }

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

          let sStartDate = "";
          let sEndDate = "";

          // Extract filter values
          aFilterItems.forEach((oItem) => {
            const sFieldName = oItem.getName();
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

              case "PostDate": {
                const oDateRange = oControl.getDateValue(); // Start date
                const oSecondDate = oControl.getSecondDateValue(); // End date

                if (oDateRange && oSecondDate) {
                  const oDateFormat =
                    sap.ui.core.format.DateFormat.getDateInstance({
                      pattern: "yyyy-MM-dd",
                    });
                  sStartDate = oDateFormat.format(oDateRange);
                  sEndDate = oDateFormat.format(oSecondDate);
                }
                break;
              }
            }
          });

          const bEmpty =
            Object.values(oFilterPayload).every((val) => !val) &&
            !sStartDate &&
            !sEndDate;

          if (bEmpty) {
            this._fetchJobOpenings();
            this._setBackendStatusModel();
            return;
          }

          try {
            this.getBusyDialog();

            const oResponse = await this.ajaxReadWithJQuery("JobOpenings", {
              ...oFilterPayload,
              StartDate: sStartDate,
              EndDate: sEndDate,
            });

            const aData = oResponse?.data || [];

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
              " " + (err?.responseJSON?.message || err?.message)
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

          // Flatten and extract all skills
          const aMatchedSkills = aTableData
            .map((item) => item.PrimarySkills?.split(",") || [])
            .flat()
            .map((skill) => skill.trim())
            .filter((skill) => skill.toLowerCase().includes(sValue));

          //  Remove duplicates
          const aUniqueSkills = [...new Set(aMatchedSkills)];

          // Convert to suggestion item format
          const aSuggestionItems = aUniqueSkills.map((skill) => ({ skill }));

          // Bind to model
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
          this.byId("filterPostDate").setValue("");
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
        onOpenQualificationsDialog: function () {
          const oTempModel = this.getView().getModel("QualificationModel");

          this._commonFragmentOpen(
            oTempModel,
            "sap.kt.com.minihrsolution.fragment.SelectQualificationsDialog",
            "SelectQualificationsDialog"
          );
        },
        onConfirmQualifications: function (oEvent) {
          const aSelectedItems = oEvent.getParameter("selectedItems") || [];
          const aValues = aSelectedItems.map((item) => item.getTitle());

          // Update model
          const oTempModel = this.getView().getModel("temporaryModel");
          if (oTempModel) {
            oTempModel.setProperty("/qualifications", aValues);
          }

          // Update UI tokens
          const oMultiInput = this.byId("multiInputQualifications");
          oMultiInput.destroyTokens();
          aValues.forEach((q) => {
            oMultiInput.addToken(new sap.m.Token({ text: q, key: q }));
          });

          this.validation._strictValidationMultiInput(
            oMultiInput,
            aValues,
            "At least one qualification is required."
          );
        },

        onSearchQualifications: function (oEvent) {
          const sQuery = oEvent.getParameter("value");
          const oFilter = new sap.ui.model.Filter(
            "",
            sap.ui.model.FilterOperator.Contains,
            sQuery
          );
          oEvent.getSource().getBinding("items").filter([oFilter]);
        },
      }
    );
  }
);
