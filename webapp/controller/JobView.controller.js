sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
  ],
  (BaseController, JSONModel, utils, MessageToast, Fragment, MessageBox) => {
    ("use strict");
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.JobView",
      {
        onInit: function () {
          this.getView().addStyleClass("sapUiSizeCompact");

          // Attach route match handler
          this.getOwnerComponent()
            .getRouter()
            .getRoute("RouteJobView")
            .attachPatternMatched(this._onRouteMatched, this);

          // Load i18n bundle
          const oI18nModel = this.getOwnerComponent().getModel("i18n");
          this.oResourceBundle = oI18nModel.getResourceBundle();

          // Init cities model
          this.getView().setModel(new JSONModel({ cities: [] }), "cities");

          // Init token model for file uploads
          this.tokenModel = new JSONModel({ tokens: [] });
          this.getView().setModel(this.tokenModel, "tokenModel");

          // File model (yeh 'this.oFileModel' kahan se aa raha hai? Ensure it's defined or remove if not needed)
          this.getView().setModel(this.oFileModel); // Is line ko verify karein ya hata dein agar this.oFileModel defined nahi hai.

          // File input change listener (ensure 'hiddenFileInput' ID exists in XML)
          setTimeout(() => {
            const fileInput = document.getElementById("hiddenFileInput");
            if (fileInput) {
              fileInput.addEventListener(
                "change",
                this.onFilesSelected.bind(this)
              );
            }
          }, 0);
        },

        // 🚦 Route handler — when user navigates to /JobView/:jobId
        // _onRouteMatched: function (oEvent) {
        //   const sJobId = oEvent.getParameter("arguments").jobId;
        //   console.log("[Route] Job ID matched:", sJobId);

        //   this.getBusyDialog();

        //   this._fetchJobById(sJobId)
        //     .then((oJob) => {
        //       if (oJob) {
        //         // ✅ JobApplicationModel ko ek baar define aur set karein
        //         // Yeh model main view pe set hoga aur fragment ise inherit karega.
        //         // Isme fetched job data hogi.
        //         const oJobApplicationModel = new JSONModel(oJob);
        //         this.getView().setModel(
        //           oJobApplicationModel,
        //           "JobApplicationModel"
        //         );

        //         console.log(
        //           "[Model] JobApplicationModel set with data:",
        //           oJobApplicationModel.getData()
        //         );
        //       } else {
        //         MessageToast.show("No job found.");
        //         console.warn("[Warn] No job returned for ID:", sJobId);
        //       }
        //     })
        //     .catch((err) => {
        //       console.error("[Error] Failed to fetch job:", err);
        //       MessageToast.show("Failed to fetch job details.");
        //     })
        //     .finally(() => {
        //       this.closeBusyDialog();
        //     });
        // },
        _onRouteMatched: function (oEvent) {
          const sJobId = oEvent.getParameter("arguments").jobId;
          console.log("[Route] Job ID matched:", sJobId);

           this.getBusyDialog();

          this._fetchJobById(sJobId)
            .then((oJob) => {
              const bIsValidJob = !!oJob;
              const oJobApplicationModel = new JSONModel({
                ...oJob,
                isValidJob: bIsValidJob, // 👈 new flag
              });

              this.getView().setModel(
                oJobApplicationModel,
                "JobApplicationModel"
              );

              if (!bIsValidJob) {
                if (!oData || !oData.JobTitle) {
                  this.getView().byId("jobDetailsContainer").setVisible(false); // hide main content block
                  // Optionally trigger a toast or log
                }

                // MessageToast.show("Job not available.");
                console.warn("[Route] No valid job data for ID:", sJobId);
              }
            })
            .catch((err) => {
              console.error("[Error] Failed to fetch job:", err);
              MessageToast.show("Failed to fetch job details.");
            })
            .finally(() => {
              this.closeBusyDialog();
            });
        },

        _fetchJobById: function (sJobId) {
          const sUrl = "https://rest.kalpavrikshatechnologies.com/JobOpenings";
          console.log(
            "[API] Fetching job list for filtering by ID and Status:",
            sJobId
          );

          return new Promise((resolve, reject) => {
            $.ajax({
              url: sUrl,
              method: "GET",
              contentType: "application/json",
              dataType: "json",
              headers: {
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                  "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              },
              success: function (oData) {
                const aData = oData?.data || [];
                console.log("[API] Total jobs fetched:", aData.length);

                const oFilteredJob = aData.find((job) => {
                  const idMatch = job?.ID === sJobId;
                  const statusTrue = job?.Status === "true";

                  if (idMatch && statusTrue) {
                    return true; // ✅ Only show this
                  }
                  return false; // ❌ Hide others
                });

                if (oFilteredJob) {
                  resolve(oFilteredJob);
                } else {
                  resolve(null); // Job doesn't qualify
                }
              },
              error: function (xhr, status, error) {
                console.error("[API Error]", status, error);
                reject(error);
              },
            });
          });
        },

        onFileChange: function (oEvent) {
          const oFile = oEvent.getParameter("files")[0];
          if (!oFile) {
            MessageToast.show("No file selected.");
            return;
          }
          const oModel = this.getView().getModel("tokenModel");
          let aTokens = oModel.getProperty("/tokens") || [];

          // Restrict to one file
          if (aTokens.length >= 1) {
            sap.m.MessageBox.error("Only one file uploaded");
            return;
          }

          const reader = new FileReader();
          const that = this;

          reader.onload = function (e) {
            const base64 = e.target.result.split(",")[1];
            const oUploadModel = that.getView().getModel("UploadModel");
            if (!oUploadModel) {
              that
                .getView()
                .setModel(new sap.ui.model.json.JSONModel(), "UploadModel");
            }
            that.getView().getModel("UploadModel").setData({
              File: base64,
              FileName: oFile.name,
              FileType: oFile.type,
            });
            aTokens.push({
              key: oFile.name,
              text: oFile.name,
            });
            oModel.setProperty("/tokens", aTokens);

            const fileErrorLayout = sap.ui.core.Fragment.byId(
              "jobFormFrag",
              "fileErrorLayout"
            );

            const fileErrorText = sap.ui.core.Fragment.byId(
              "jobFormFrag",
              "fileErrorText"
            );
            fileErrorText.setText("");
            fileErrorText.setVisible(false);
            fileErrorLayout.setVisible(false);

            MessageToast.show("File uploaded successfully: " + oFile.name);
          };

          reader.readAsDataURL(oFile);
        },

        onTokenDelete: function (oEvent) {
          // Get the model
          var oModel = this.getView().getModel("tokenModel");
          var aTokens = oModel.getProperty("/tokens") || [];

          // Get deleted tokens from event
          var aTokensToDelete = oEvent.getParameter("tokens");

          // Filter out deleted tokens
          aTokensToDelete.forEach(function (oDeletedToken) {
            var sKey = oDeletedToken.getKey();
            aTokens = aTokens.filter(function (token) {
              return token.key !== sKey;
            });
          });

          // Update model
          oModel.setProperty("/tokens", aTokens);

          // Clear upload model if all tokens are deleted
          if (aTokens.length === 0) {
            const uploadModel = this.getView().getModel("UploadModel");
            if (uploadModel) {
              uploadModel.setData({
                File: "",
                FileName: "",
                FileType: "",
              });
            }

            const fileErrorText = sap.ui.core.Fragment.byId(
              "jobFormFrag",
              "fileErrorText"
            );
            const fileErrorLayout = sap.ui.core.Fragment.byId(
              "jobFormFrag",
              "fileErrorLayout"
            );

            if (fileErrorText) {
              fileErrorText.setText("Please upload your resume");
              fileErrorText.setVisible(true);
              fileErrorLayout.setVisible(true);
            }

            this.oSelectedFile = null;
          }
        },

        onFileSizeExceeds: function (oEvent) {
          const fileErrorText = sap.ui.core.Fragment.byId(
            "jobFormFrag",
            "fileErrorText"
          );
          const fileErrorLayout = sap.ui.core.Fragment.byId(
            "jobFormFrag",
            "fileErrorLayout"
          );
          fileErrorLayout.setVisible(true);
          fileErrorText.setVisible(true);
          fileErrorText.setText("File size must be under 5MB");

          const fileUploader = oEvent.getSource();

          loader.setValueStateText("File too large");

          //  Clear fileUploader input
          fileUploader.setValue("");

          //  Clear UploadModel
          const uploadModel = this.getView().getModel("UploadModel");
          if (uploadModel) {
            uploadModel.setData({
              File: "",
              FileName: "",
              FileType: "",
            });
          }

          //  Clear Tokenizer model
          const tokenizer = sap.ui.core.Fragment.byId(
            "jobFormFrag",
            "id_tokenizer"
          );
          const tokenModel = tokenizer.getModel("tokenModel");
          if (tokenModel) {
            tokenModel.setProperty("/tokens", []);
          }

          //  Clear stored file
          this.oSelectedFile = null;
        },

        // onNavBack: function () {
        //   this.getOwnerComponent().getRouter().navTo("RouteHomePage");
        // },

        onNavBack: function () {
          const oAppStateModel =
            this.getOwnerComponent().getModel("AppStateModel");
          const sTabKey =
            oAppStateModel?.getProperty("/previousTab") || "idHome";

          this.getOwnerComponent().getRouter().navTo("RouteHomePage");

          // Save tab key temporarily to session
          sessionStorage.setItem("homePageReturnTab", sTabKey);
        },

        anySkillPresent: function (primary, secondary, required) {
          return (
            (primary && primary.trim().length > 0) ||
            (secondary && secondary.trim().length > 0) ||
            (required && required.trim().length > 0)
          );
        },

        hasValue: function (val) {
          if (val === null || val === undefined) {
            return false;
          }

          if (typeof val === "string") {
            return val.trim().length > 0;
          }

          if (typeof val === "number") {
            return val !== 0; // e.g., 1 returns true, 0 returns false
          }

          return !!val; // fallback — converts to boolean
        },
        getWorkModeTooltip: function (sMode) {
          switch ((sMode || "").toUpperCase()) {
            case "REMOTE":
              return "Work from home";
            case "ON-SITE":
              return "Work from office";
            case "HYBRID":
              return "Combination of remote and on-site work";
            default:
              return "Work mode information not available";
          }
        },
        formatWorkModeLabel: function (sValue) {
          if (!sValue) return "";

          switch (sValue.toUpperCase()) {
            case "HYBRID":
              return "Hybrid";
            case "REMOTE":
              return "Remote";
            case "ON-SITE":
              return "On-Site";
            default:
              return sValue;
          }
        },
        _cleanFormattedTextStyles: function () {
          const els = document.querySelectorAll(
            ".myFormattedText span, .myFormattedText li, .myFormattedText strong, .myFormattedText .highlight, .myFormattedText p"
          );
          els.forEach((el) => {
            el.removeAttribute("style");
            el.style.fontSize = "20px";
            el.style.lineHeight = "1.5";
            el.style.marginBottom = "1em";
            el.style.fontWeight = "bold";
            el.style.color = "#2c3e50";
          });
        },
          getFormDataAsJSON: function () {
          const safeVal = (ctrl) => ctrl?.getValue?.().trim?.() || "";
          const safeKey = (ctrl) => ctrl?.getSelectedKey?.().trim?.() || "";
          // const safeText = (ctrl) => ctrl?.getSelectedItem?.()?.getText?.().trim?.() || "";
          const safeText = (ctrl) =>
            ctrl?.getValue?.().trim?.() ||
            ctrl?.getSelectedItem?.()?.getText?.().trim?.() ||
            "";

          const safeDate = (date) =>
            date instanceof Date ? date.toISOString().split("T")[0] : "";
          const f = (id) => sap.ui.core.Fragment.byId("jobFormFrag", id);
          const view = this.getView();

          //  Personal Details
          const fullName = safeVal(f("fullNameInput"));
          const gender =
            safeKey(f("genderCombo")) || safeText(f("genderCombo"));
          const mobile = safeVal(f("mobileInput"));
          const email = safeVal(f("emailInput"));
          const address = safeVal(f("addressInput"));
          const dob = safeDate(f("dobPicker")?.getDateValue?.());

          //  Education
          const university =
            safeText(f("universityCombo")) || safeVal(f("universityCombo"));
          const passingYear = safeVal(f("PassingYear"));
          const skills = safeVal(f("skillsInput"));
          const qualification =
            safeText(f("qualificationCombo")) ||
            safeVal(f("qualificationCombo"));

          //  Experience (may be empty if fresher)
          const experience = safeVal(f("experienceInput"));
          const company = safeVal(f("companyInput"));
          const designation = safeText(f("previousJobTitleCombo")) || "";
          const salary = safeVal(f("salaryInput"));
          // const previousRoles = safeVal(f("rolesInput"));

          const workDurationStart = safeDate(
            f("experienceRange")?.getDateValue?.()
          );
          const workDurationEnd = safeDate(
            f("experienceRange")?.getSecondDateValue?.()
          );
          const employmentType =
            safeText(f("employmentTypeCombo")) ||
            safeKey(f("employmentTypeCombo"));
          const noticePeriod =
            safeText(f("noticePeriodCombo")) || safeVal(f("noticePeriodCombo"));
          const expectedSalary = safeVal(f("expectedSalaryInput"));
          const describeYourSelf = safeVal(f("fresherSelfDesc"));
          const expertise = safeText(f("fresherExpertiseInput"));

          // const roles = safeText(f("rolesInput"));
          const roles = safeVal(f("rolesInput"));

          // const roles = safeText(f("rolesInput")).trim();

          //  Location
          const country =
            safeText(f("countryCombo")) || safeVal(f("countryCombo"));
          const isd = safeText(f("isd_code")) || safeVal(f("isd_code"));
          // const city = safeText(f("LocationComboBox")) || safeVal(f("LocationComboBox"));
          const city = f("LocationComboBox").getSelectedKey();

          // Resume
          const uploadModel = view.getModel("UploadModel")?.getData?.() || {};
          const fileBase64 = uploadModel.File || "";
          const fileName = uploadModel.FileName || "";
          const fileType = uploadModel.FileType || "";

          //  Job Title from external model
          // const jobTitle =
          //   view.getModel("SelectedCandidate")?.getProperty("/JobTitle") ||
          //   "Unknown";
          const jobTitle =
            this.getView()
              .getModel("JobApplicationModel")
              ?.getProperty("/JobTitle") || "Unknown"; // ✅ Changed from SelectedCandidate

          //  Final Payload
          return {
            FullName: fullName,
            Gender: gender,
            Mobile: mobile,
            Email: email,
            Address: address,
            DOB: dob,

            University: university,
            PassingYear: passingYear,
            Skills: skills,
            HighestQualifaction: qualification,

            Experience: experience,
            CurrentCompany: company,
            Designation: designation,
            // PreviousRoles: previousRoles,
            CurrentSalary: salary,
            WorkDurationStart: workDurationStart,
            WorkDurationEnd: workDurationEnd,
            Roles: roles,

            EmploymentType: employmentType,
            NoticePeriod: noticePeriod,
            ExpectedSalary: expectedSalary,

            ExpertiseIn: expertise,
            DescribeYourSelf: describeYourSelf,

            ISD: isd,
            Country: country,
            City: city,

            JobTitle: jobTitle,
            ResumeFile: fileBase64,
            CreatedBy: "Candidate",
            AttachmentName: fileName,
            AttachmentType: fileType,
            CreateDate: new Date().toISOString().split("T")[0], // → "2025-07-29"
          };
        },

        _cleanUnsupportedTags: function (html) {
          return html
            .replace(/<mark>/gi, '<span class="highlight">')
            .replace(/<\/mark>/gi, "</span>");
        },

        onApply: function () {
          const that = this;

          // Create and attach JobModel
          const oJobData = {
            fullName: "",
            email: "",
            mobile: "",
            country: "",
            stdCode: "",
            city: "",
            dob: null,
            passingYear: null,
            experienceRange: {
              start: null,
              end: null,
            },
            resume: "",
            qualification: "",
            university: "",
            noticePeriod: "",
            previousDesignation: "",
            Roles: "",
            ExpertiseIn: "",
          };

          const oJobModel = new sap.ui.model.json.JSONModel(oJobData);
          this.getView().setModel(oJobModel, "JobModel");

          if (!this._oJobDialog) {
            Fragment.load({
              id: "jobFormFrag",
              name: "sap.kt.com.minihrsolution.fragment.JobApplication",
              controller: this,
            }).then(function (oDialog) {
              that._oJobDialog = oDialog; //  Save the actual Dialog after loading
              that.getView().addDependent(oDialog);
              //  Optional: inject into fragment also
              //              oDialog.setModel(oJobModel, "JobModel");
              oDialog.setModel(oJobModel, "JobApplicationModel");

              // Get the JobApplicationModel that was already set on the View
              // (e.g., from _onRouteMatched function)
              const oJobApplicationModelFromView = that
                .getView()
                .getModel("JobApplicationModel");

              // *** FIX 1: Set JobApplicationModel on Dialog ***
              if (oJobApplicationModelFromView) {
                oDialog.setModel(
                  oJobApplicationModelFromView,
                  "JobApplicationModel"
                );

                // *** FIX 2: Programmatically set the Dialog Title ***
                const jobTitle =
                  oJobApplicationModelFromView.getProperty("/JobTitle");
                if (jobTitle) {
                  oDialog.setTitle("Job Application — " + jobTitle);
                  console.log(
                    "Dialog title set programmatically:",
                    oDialog.getTitle()
                  );
                } else {
                  oDialog.setTitle("Job Application"); // Default if title is not found
                  console.warn(
                    "JobTitle not found in JobApplicationModel, using default title."
                  );
                }
              } else {
                // Fallback: Agar kisi wajah se JobApplicationModel view par set nahi hai,
                // toh ek naya model bana dein. Ideally, this block should not be hit
                // if _onRouteMatched works correctly.
                const oFallbackJobModel = new sap.ui.model.json.JSONModel({
                  JobTitle: "Job Application", // Default title if not found
                  // ... other properties if needed ...
                });
                oDialog.setModel(oFallbackJobModel, "JobApplicationModel");
                oDialog.setTitle("Job Application"); // Set fallback title
                console.warn(
                  "JobApplicationModel not found on View, using fallback for dialog title."
                );
              }
              // *** END FIX ***

              //  Inject global models into fragment if not already done
              ["CountryModel", "codeModel", "BaseLocationModel"].forEach(
                (sName) => {
                  const oGlobalModel = that.getOwnerComponent().getModel(sName);
                  if (oGlobalModel) {
                    oDialog.setModel(oGlobalModel, sName);
                  }
                }
              );
              //  Reattach tokenModel to the dialog fragment
              const tokenModel =
                that.tokenModel ||
                new sap.ui.model.json.JSONModel({
                  tokens: [],
                });
              oDialog.setModel(tokenModel, "tokenModel");
              const fileUploader = sap.ui.core.Fragment.byId(
                "jobFormFrag",
                "jobFileUploader"
              );
              if (fileUploader) {
                fileUploader.data("required", true); //  runtime-only
              }

              //  Set DOB min/max range
              const oToday = new Date();
              const oMinDOB = new Date(
                oToday.getFullYear() - 65,
                oToday.getMonth(),
                oToday.getDate()
              );
              const oMaxDOB = new Date(
                oToday.getFullYear() - 18,
                oToday.getMonth(),
                oToday.getDate()
              );
              const oDatePicker = Fragment.byId("jobFormFrag", "dobPicker");
              if (oDatePicker) {
                oDatePicker.setMinDate(oMinDOB);
                oDatePicker.setMaxDate(oMaxDOB);
                // set datepicker focus to 2000-01-01
                oDatePicker.setInitialFocusedDateValue(new Date(2000, 0, 1));
              }

              // local json countries file
              const oCountryModel = new sap.ui.model.json.JSONModel();
              oCountryModel.loadData("model/countries.json");
              // oCountryModel.setSizeLimit(250); //  //
              that.getView().setModel(oCountryModel, "countries");
              oCountryModel.attachRequestCompleted(function () {});

              const oCities = new sap.ui.model.json.JSONModel();
              oCities.loadData("model/cities.json");
              oCities.setSizeLimit(500);
              that.getView().setModel(oCities, "cities");

              oCities.attachRequestCompleted(function () {});

              const oQualModel = new sap.ui.model.json.JSONModel();
              oQualModel.loadData("model/qualifications.json");
              that.getView().setModel(oQualModel, "qualifications");

              const oUniModel = new sap.ui.model.json.JSONModel();
              oUniModel.loadData("model/universities.json");
              oUniModel.setSizeLimit(1000);
              that.getView().setModel(oUniModel, "universities");

              oUniModel.attachRequestCompleted(function () {});

              //PreviousJob model definition
              const oPrevJobModel = new sap.ui.model.json.JSONModel();
              oPrevJobModel.loadData("model/PreviousJobTitles.json");
              that.getView().setModel(oPrevJobModel, "DesignationModel");

              // notice period model
              const oNoticePeriod = new sap.ui.model.json.JSONModel();
              oNoticePeriod.loadData("model/noticePeriod.json");
              //oCities.setSizeLimit(500);
              that.getView().setModel(oNoticePeriod, "noticePeriod");

              const oISDModel = new sap.ui.model.json.JSONModel();
              oISDModel.loadData("model/isd.json");
              oISDModel.setSizeLimit(300);
              oISDModel.attachRequestCompleted(function () {
                const aAllISD = oISDModel.getData()?.ISDCodes || [];

                //  Extract unique ISD codes based on "text"
                const seen = {};
                const aUniqueISD = aAllISD.filter((item) => {
                  if (!seen[item.text]) {
                    seen[item.text] = true;
                    return true;
                  }
                  return false;
                });

                //  Set cleaned list back to model
                oISDModel.setData({
                  ISDCodes: aUniqueISD,
                });
              });

              // bind to view
              that.getView().setModel(oISDModel, "isd");

              //  Year of Passing: allow selection only between current year and 45 years back
              const oYearPicker = Fragment.byId("jobFormFrag", "PassingYear");
              if (oYearPicker) {
                const oToday = new Date();
                const oMaxYear = new Date(oToday.getFullYear(), 11, 31); // Current year end
                const oMinYear = new Date(oToday.getFullYear() - 45, 0, 1); // Jan 1st 45 years ago

                oYearPicker.setMinDate(oMinYear);
                oYearPicker.setMaxDate(oMaxYear);
                // oYearPicker.setDateValue(oMaxYear); // Optional: pre-fill with current year

                const oToday2 = new Date();

                //  DOB limits
                const oMinDOB = new Date(
                  oToday2.getFullYear() - 65,
                  oToday2.getMonth(),
                  oToday2.getDate()
                );
                const oMaxDOB = new Date(
                  oToday2.getFullYear() - 18,
                  oToday2.getMonth(),
                  oToday2.getDate()
                );
                const oDOB = Fragment.byId("jobFormFrag", "dobPicker");
                if (oDOB) {
                  oDOB.setMinDate(oMinDOB);
                  oDOB.setMaxDate(oMaxDOB);
                }

                //  Work Experience limits (30 years ago to 90 days ahead)
                const oExpRange = Fragment.byId(
                  "jobFormFrag",
                  "experienceRange"
                );
                if (oExpRange) {
                  const oMinStart = new Date(
                    oToday2.getFullYear() - 30,
                    oToday2.getMonth(),
                    oToday2.getDate()
                  );
                  const oMaxEnd = new Date(
                    oToday2.getTime() + 90 * 24 * 60 * 60 * 1000
                  );

                  oExpRange.setMinDate(oMinStart);
                  oExpRange.setMaxDate(oMaxEnd);
                }
                oDialog.open();
              }
            });
          } else {
            this._oJobDialog.open(); //  Now this is safe and will not error
          }
        },

        onClose: function () {
          if (this._oJobDialog) {
            this._oJobDialog.close();
            this.getView().getModel("tokenModel").setProperty("/tokens", []);
            this._oJobDialog.destroy();
            this._oJobDialog = null;
          }
        },

        onLiveChangeFullName: function (oEvent) {
          utils._LCvalidateName(oEvent);
        },

        onCompanyChange: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        onMobileChange: function (oEvent) {
          utils._LCvalidateMobileNumber(oEvent);
        },

        onEmailChange: function (oEvent) {
          utils._LCvalidateEmail(oEvent);
        },

        onAddressChange: function (oEvent) {
          const oInput = oEvent.getSource();
          const sValue = oInput.getValue().trim();

          if (!sValue) {
            // Empty is allowed
            oInput.setValueState("None");
            oInput.setValueStateText("");
            return;
          }

          if (sValue.length < 8) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
              "Address must be at least 8 characters long"
            );
          } else {
            oInput.setValueState("None");
            oInput.setValueStateText("");
          }
        },

        onLearningChange: function (oEvent) {
          const oSource = oEvent.getSource();
          const sValue = oSource.getValue().trim();

          if (!sValue) {
            oSource.setValueState("None");
            oSource.setValueStateText("");
            return;
          }

          if (sValue.length < 8) {
            oSource.setValueState("Error");
            oSource.setValueStateText(
              "Minimum 8 characters on Learning Journey"
            );
          } else {
            oSource.setValueState("None");
            oSource.setValueStateText("");
          }
        },

        onExpertiseChange: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        // onRolesChange: function (oEvent) {
        //   utils._LCvalidateMandatoryField(oEvent);
        // },

        onSkillsChange: function (oEvent) {
          var oInput = oEvent.getSource();
          var sValue = oInput.getValue();

          // Trim just for visual cleanup — do not use for length or alpha count
          var sTrimmed = sValue.trim();

          // Rule 1: Must be minimum 8 characters
          var bMinLength = sValue.length >= 8;

          // Rule 2: Must contain at least 10 alphabets (a-z, A-Z)
          var letterMatches = sValue.match(/[a-zA-Z]/g);
          var bHasEnoughLetters = letterMatches && letterMatches.length >= 8;

          // Rule 3: Must not be all spaces or just symbols
          var bNotOnlySpaces = !/^\s*$/.test(sValue); // not just spaces
          var bNotOnlyDots = !/^[.]+$/.test(sValue); // not just dots

          if (
            !bMinLength ||
            !bHasEnoughLetters ||
            !bNotOnlySpaces ||
            !bNotOnlyDots
          ) {
            oInput.setValueState(sap.ui.core.ValueState.Error);
            const sMessage = this.oResourceBundle.getText("v2_m_errSkills");
            //  MessageToast.show(sMessage);

            oInput.setValueStateText(sMessage);
          } else {
            oInput.setValueState(sap.ui.core.ValueState.None);
            oInput.setValueStateText("");
          }
        },
        onDOBChange: function (oEvent) {
          var oDatePicker = oEvent.getSource();
          var sId = oDatePicker.getId();

          // Reapply readonly protection after any change (in case of re-render)
          this._makeDatePickersReadOnly([sId]);

          var oSelectedDate = oDatePicker.getDateValue(); // parsed Date object
          var sRawValue = oDatePicker.getValue(); // user input (string)

          // 1. If field is empty — valid (optional field)
          if (!sRawValue) {
            oDatePicker.setValueState(sap.ui.core.ValueState.None);
            oDatePicker.setValueStateText("");
            return;
          }

          // 2. If input is non-empty, but parsed date is invalid — error
          if (!oSelectedDate || isNaN(oSelectedDate.getTime())) {
            oDatePicker.setValueState(sap.ui.core.ValueState.Error);
            const sMessage = this.oResourceBundle.getText("v2_m_errDOB"); // e.g., "Invalid date format"
            oDatePicker.setValueStateText(sMessage);
            return;
          }

          // 3. Valid date selected — perform age validation
          var oToday = new Date();

          var oMaxDOB = new Date(
            oToday.getFullYear() - 18,
            oToday.getMonth(),
            oToday.getDate()
          );
          var oMinDOB = new Date(
            oToday.getFullYear() - 65,
            oToday.getMonth(),
            oToday.getDate()
          );

          if (oSelectedDate > oMaxDOB) {
            oDatePicker.setValueState(sap.ui.core.ValueState.Error);
            const sMessage = this.oResourceBundle.getText("v2_m_err18YO"); // e.g., "Must be at least 18"
            oDatePicker.setValueStateText(sMessage);
          } else if (oSelectedDate < oMinDOB) {
            oDatePicker.setValueState(sap.ui.core.ValueState.Error);
            const sMessage = this.oResourceBundle.getText("v2_m_err65YO"); // e.g., "Must be younger than 65"
            oDatePicker.setValueStateText(sMessage);
          } else {
            oDatePicker.setValueState(sap.ui.core.ValueState.None);
            oDatePicker.setValueStateText("");
          }
        },

        onSalaryChange: function (oEvent) {
          var oInput = oEvent.getSource();
          var sValue = oInput.getValue();

          // Block invalid characters instantly (remove alphabets, symbols except '.')
          sValue = sValue.replace(/[^0-9.]/g, "");

          // Allow only one decimal point
          var parts = sValue.split(".");
          if (parts.length > 2) {
            parts = [parts[0], parts[1]]; // remove extra dots
          }

          // Limit to 2 decimal digits
          if (parts[1]) {
            parts[1] = parts[1].substring(0, 2);
          }

          // Rebuild clean value
          var cleanValue = parts.join(".");

          // Block starting with 0 unless followed by '.'
          if (/^0\d/.test(cleanValue)) {
            cleanValue = cleanValue.replace(/^0+/, ""); // Remove leading zero(s)
          }

          // Update input value immediately (blocks typing junk)
          oInput.setValue(cleanValue);

          // Final validation: format + length + minimum amount
          var regex = /^(?!0\d)\d{1,9}(\.\d{0,2})?$/;
          var isFormatValid = regex.test(cleanValue);
          var isMinValid = parseFloat(cleanValue) >= 50000;

          if (isFormatValid && isMinValid && cleanValue.length <= 12) {
            oInput.setValueState(sap.ui.core.ValueState.None);
            oInput.setValueStateText("");
          } else {
            oInput.setValueState(sap.ui.core.ValueState.Error);

            const sMessage = this.oResourceBundle.getText("v2_m_errSal");

            oInput.setValueStateText(sMessage);
          }
        },

        onExperienceToggle: function (oEvent) {
          const fragId = "jobFormFrag";
          const bIsExperienced = oEvent.getParameter("state");

          const oExpSection = sap.ui.core.Fragment.byId(
            fragId,
            "experienceSection"
          );
          const oFreshSection = sap.ui.core.Fragment.byId(
            fragId,
            "fresherSection"
          );

          // Helper to clear values and error states
          const clearSectionInputs = (section) => {
            if (!section || !section.getItems) return;
            section.getItems().forEach((ctrl) => {
              if (typeof ctrl.setValue === "function") ctrl.setValue("");
              if (typeof ctrl.setSelectedKey === "function")
                ctrl.setSelectedKey("");
              if (typeof ctrl.setDateValue === "function")
                ctrl.setDateValue(null);
              if (typeof ctrl.setValueState === "function")
                ctrl.setValueState("None");
            });
          };

          // Toggle visibility
          oExpSection.setVisible(bIsExperienced);
          oFreshSection.setVisible(!bIsExperienced);

          // Clear inputs in the section that is being hidden
          if (bIsExperienced) {
            clearSectionInputs(oFreshSection);
          } else {
            clearSectionInputs(oExpSection);
          }
        },

        onExperienceChange: function (oEvent) {
          const oInput = oEvent.getSource();
          const sValue = oInput.getValue().trim();

          const fValue = parseFloat(sValue);
          const isValid =
            /^[0-9]+(\.[0-9]{1,2})?$/.test(sValue) &&
            fValue >= 0.1 &&
            fValue <= 30;

          if (!isValid) {
            oInput.setValueState("Error");

            const sMessage = this.oResourceBundle.getText("v2_m_errExp");
            oInput.setValueStateText(sMessage);
          } else {
            oInput.setValueState("None");
          }
        },
        validateStartEndDates: function (oStartDatePicker, oEndDatePicker) {
          const oStart = oStartDatePicker.getDateValue();
          const oEnd = oEndDatePicker.getDateValue();
          const oToday = new Date();

          if (!oStart || !oEnd || oStart > oEnd || oEnd > oToday) {
            oEndDatePicker.setValueState("Error");
            const sMessage = this.oResourceBundle.getText("v2_m_errEnddate");
            oEndDatePicker.setValueStateText(sMessage);
          } else {
            oEndDatePicker.setValueState("None");
          }
        },
        // onExperienceDateChange: function (oEvent) {
        //   const oRange = oEvent.getSource();
        //   const oStart = oRange.getDateValue(); // Start Date
        //   const oEnd = oRange.getSecondDateValue(); // End Date
        //   const today = new Date();

        //   const minStartDate = new Date(
        //     today.getFullYear() - 30,
        //     today.getMonth(),
        //     today.getDate()
        //   );

        //   //  Error Messages
        //   const sMissing = this.oResourceBundle.getText("v2_m_errDatesreq");
        //   const sOrder = this.oResourceBundle.getText("v2_m_errStDatb4endDate");
        //   const sRange = this.oResourceBundle.getText("v2_m_errbetLast30Yrs");

        //   let errorMsg = "";

        //   if (!oStart || !oEnd) {
        //     errorMsg = sMissing;
        //   } else if (oStart > oEnd) {
        //     errorMsg = sOrder;
        //   } else if (oStart < minStartDate) {
        //     errorMsg = sRange;
        //   }

        //   if (errorMsg) {
        //     oRange.setValueState("Error");
        //     oRange.setValueStateText(errorMsg);
        //   } else {
        //     oRange.setValueState("None");
        //     oRange.setValueStateText("");
        //   }
        // },

        // ...existing code...
        onPassingYearChange: function (oEvent) {
          const oDatePicker = oEvent.getSource();
          const sValue = oDatePicker.getValue().trim(); // User input string
          const oToday = new Date();
          const minYear = oToday.getFullYear() - 45;
          const maxYear = oToday.getFullYear();

          // Allow empty input (optional field)
          if (!sValue) {
            oDatePicker.setValueState("None");
            oDatePicker.setValueStateText("");
            return;
          }

          // If input is not a 4-digit year
          if (!/^\d{4}$/.test(sValue)) {
            oDatePicker.setValueState("Error");
            oDatePicker.setValueStateText(
              `Enter a valid year between ${minYear} and ${maxYear}`
            );
            return;
          }

          const year = parseInt(sValue, 10);
          if (year < minYear || year > maxYear) {
            oDatePicker.setValueState("Error");
            oDatePicker.setValueStateText(
              `Enter a year between ${minYear} and ${maxYear}`
            );
            return;
          }

          // Valid year
          oDatePicker.setValueState("None");
          oDatePicker.setValueStateText("");
        },

        // ...existing code...
        onComboBoxChange: function (oEvent) {
          const combo = oEvent.getSource();
          const selectedKey = combo.getSelectedKey();

          if (combo.getRequired && combo.getRequired()) {
            if (!selectedKey || selectedKey.trim() === "") {
              combo.setValueState("Error");
              combo.setValueStateText("Please Choose from List");
            } else {
              combo.setValueState("None");
            }
          }
        },

        onNoticePeriodChange: function (oEvent) {
          utils._LCstrictValidationComboBox(oEvent);
        },

        onEmpTypeChange: function (oEvent) {
          const oComboBox = oEvent.getSource();
          const sValue = oComboBox.getValue().trim();

          if (!sValue) {
            oComboBox.setValueState("None");
            oComboBox.setValueStateText("");
            return;
          }

          // FIX: Pass the full event
          utils._LCstrictValidationComboBox(oEvent);
        },

        onDesignationChange: function (oEvent) {
          const oComboBox = oEvent.getSource();
          const sValue = oComboBox.getValue().trim();

          if (!sValue) {
            oComboBox.setValueState("None");
            oComboBox.setValueStateText("");
            return;
          }

          // FIX: Pass the full event
          utils._LCstrictValidationComboBox(oEvent);
        },

        MC_ValidateComboBox: function (oEvent) {
          utils._LCstrictValidationComboBox(oEvent);
        },
        onQalificationChange: function (oEvent) {
          utils._LCstrictValidationComboBox(oEvent);
        },

        onUniversityChange: function (oEvent) {
          const oInput = oEvent.getSource();
          const university = oInput.getValue().trim();

          // Allow empty
          if (!university) {
            oInput.setValueState("None");
            oInput.setValueStateText("");
            return;
          }

          // Basic format rule: only letters, numbers, and certain punctuation
          const isValidFormat = /^[A-Za-z0-9\s\-.,()]+$/.test(university);

          // Must contain at least one alphabet
          const hasAlphabet = /[A-Za-z]/.test(university);

          if (university.length < 8) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
              "University name must be at least 8 characters."
            );
            return;
          }

          if (!isValidFormat) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
              "Only letters, numbers, spaces, hyphens, commas, periods, and parentheses allowed."
            );
            return;
          }

          if (!hasAlphabet) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
              "University name must include at least one letter."
            );
            return;
          }

          oInput.setValueState("None");
          oInput.setValueStateText("");
        },

        onGenderChange: function (oEvent) {
          const oComboBox = oEvent.getSource();
          const sValue = oComboBox.getValue().trim();

          if (!sValue) {
            oComboBox.setValueState("None");
            oComboBox.setValueStateText("");
            return;
          } 
          utils._LCstrictValidationComboBox(oEvent, "genderInvalid");
        },

        MC_onChangeCountry: function (oEvent) {
          try {
            const oComboBox = oEvent.getSource();
            const sInputValue = oComboBox.getValue();
            const aItems = oComboBox.getItems();

            const oView = this.getView();
            const oModel = oView.getModel("JobModel");

            // 1. If blank, clear everything, no filter
            if (!sInputValue) {
              oComboBox.setValueState(sap.ui.core.ValueState.None);
              oComboBox.setValueStateText("");
              oComboBox.setSelectedKey(""); // Clear key
              if (oModel) {
                oModel.setProperty("/country", "");
                oModel.setProperty("/stdCode", "");
              }

              // Clear ISD combo
              const oISDCombo = Fragment.byId("jobFormFrag", "isd_code");
              if (oISDCombo) {
                oISDCombo.setSelectedKey("");
                oISDCombo.setEnabled(true);
                if (oISDCombo.getBinding("items")) {
                  oISDCombo.getBinding("items").filter([]); // Remove filter
                }
              }

              // Clear Location combo
              const oLocationCombo = Fragment.byId(
                "jobFormFrag",
                "LocationComboBox"
              );
              if (oLocationCombo) {
                oLocationCombo.setSelectedKey("");
                if (oLocationCombo.getBinding("items")) {
                  oLocationCombo.getBinding("items").filter([]); // Remove filter
                }
              }

              return;
            }

            // 2. Check for valid country
            const oMatchedItem = aItems.find((item) => {
              return (
                item.getText().toLowerCase() === sInputValue.toLowerCase() ||
                item.getKey().toLowerCase() === sInputValue.toLowerCase()
              );
            });

            if (!oMatchedItem) {
              // ❌ Invalid input
              oComboBox.setValueState(sap.ui.core.ValueState.Error);
              oComboBox.setValueStateText(
                this.oResourceBundle.getText("v2_m_errInvalidComboBox")
              );
              return;
            }

            // ✅ Valid country selected
            oComboBox.setSelectedKey(oMatchedItem.getKey());
            oComboBox.setValueState(sap.ui.core.ValueState.None);
            oComboBox.setValueStateText("");

            const selectedKey = oMatchedItem.getKey().toUpperCase();
            if (oModel) {
              oModel.setProperty("/country", selectedKey);
            }

            // 🌐 ISD Code Filter
            const oISDCombo = Fragment.byId("jobFormFrag", "isd_code");
            if (oISDCombo && oISDCombo.getBinding("items")) {
              const oISDFilter = new sap.ui.model.Filter(
                "country_code",
                "EQ",
                selectedKey
              );
              oISDCombo.getBinding("items").filter([oISDFilter]);

              setTimeout(() => {
                const aISDItems = oISDCombo.getItems();
                if (aISDItems.length === 1) {
                  const sCode = aISDItems[0]
                    .getBindingContext("codeModel")
                    .getObject().calling_code;
                  const sFinalCode = sCode.split(",")[0].trim();
                  oISDCombo.setSelectedKey(sFinalCode);
                  oISDCombo.setEnabled(false);
                  oModel.setProperty("/stdCode", sFinalCode);
                } else {
                  oISDCombo.setSelectedKey("");
                  oISDCombo.setEnabled(true);
                  oModel.setProperty("/stdCode", "");
                }
              }, 0);
            }

            // 📍 Location Filter
            const oLocationCombo = Fragment.byId(
              "jobFormFrag",
              "LocationComboBox"
            );
            if (oLocationCombo && oLocationCombo.getBinding("items")) {
              const oLocationFilter = new sap.ui.model.Filter(
                "CountryCode",
                "EQ",
                selectedKey
              );
              oLocationCombo.getBinding("items").filter([oLocationFilter]);
              oLocationCombo.setSelectedKey("");
            }
          } catch (error) {
            console.error("MC_onChangeCountry error:", error);
          }
        },

        MC_onBaseLocationChange: function (oEvent) {
          try {
            const oComboBox = oEvent.getSource();
            const sEnteredKey = oComboBox.getValue();
            const sSelectedKey = oComboBox.getSelectedKey();

            if (!sEnteredKey) {
              // Empty input is allowed
              oComboBox.setValueState("None");
              oComboBox.setValueStateText("");
              return;
            }

            const aItems = oComboBox.getItems();
            const bValidMatch = aItems.some(function (oItem) {
              return (
                oItem.getText().toLowerCase() === sEnteredKey.toLowerCase() ||
                oItem.getKey().toLowerCase() === sEnteredKey.toLowerCase()
              );
            });

            if (!bValidMatch) {
              oComboBox.setValueState("Error");
              oComboBox.setValueStateText(
                "Please select a valid location from the list"
              );
            } else {
              oComboBox.setValueState("None");
              oComboBox.setValueStateText("");
            }
          } catch (err) {
            console.error("MC_onBaseLocationChange error:", err);
          }
        },

        // MC_onBaseLocationChange: function (oEvent) {
        // },
        ajaxCreateWithJQuery: function (sUrl, oPayLoad) {
          return new Promise((resolve, reject) => {
            $.ajax({
              url: "https://rest.kalpavrikshatechnologies.com/" + sUrl,
              method: "POST",
              data: JSON.stringify(oPayLoad),
              contentType: "application/json",
              headers: {
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                  "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              },
              success: resolve,
              error: reject,
            });
          });
        },
        onSubmit: async function () {
          const i18n = this.oResourceBundle;
          const f = (id) => sap.ui.core.Fragment.byId("jobFormFrag", id);

          const scrollToError = (oControl) => {
            if (oControl?.getDomRef?.()) {
              oControl.getDomRef().scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          };

          const validateInOrder = (checks) => {
            for (const { ctrl, fn } of checks) {
              const valid = fn(ctrl, "ID");
              if (!valid) {
                scrollToError(ctrl);
                MessageToast.show(i18n.getText("mandetoryFields"));
                return false;
              }
            }
            return true;
          };

          const isExperienced = f("experienceSwitch")?.getState?.();

          const mandatoryChecks = [
            {
              ctrl: f("fullNameInput"),
              fn: utils._LCvalidateMandatoryField,
            },
            // {
            //   ctrl: f("genderCombo"),
            //   fn: utils._LCstrictValidationComboBox,
            // },
            {
              ctrl: f("emailInput"),
              fn: utils._LCvalidateEmail,
            },
            // {
            //   ctrl: f("countryCombo"),
            //   fn: utils._LCstrictValidationComboBox,
            // },
            // {
            //   ctrl: f("LocationComboBox"),
            //   fn: utils._LCstrictValidationComboBox,
            // },
            // {
            //   ctrl: f("addressInput"),
            //   fn: utils._LCvalidateMandatoryField,
            // },
            {
              ctrl: f("isd_code"),
              fn: utils._LCstrictValidationComboBox,
            },
            {
              ctrl: f("mobileInput"),
              fn: utils._LCvalidateMobileNumber,
            },
            // {
            //   ctrl: f("dobPicker"),
            //   fn: utils._LCvalidateMandatoryField,
            // },
            {
              ctrl: f("qualificationCombo"),
              fn: utils._LCstrictValidationComboBox,
            },
            // {
            //   ctrl: f("universityCombo"),
            //   fn: utils._LCvalidateMandatoryField,
            // },
            // {
            //   ctrl: f("PassingYear"),
            //   fn: utils._LCvalidateMandatoryField,
            // },
            {
              ctrl: f("skillsInput"),
              fn: utils._LCvalidateMandatoryField,
            },
          ];

          if (isExperienced) {
            mandatoryChecks.push(
              {
                ctrl: f("experienceInput"),
                fn: utils._LCvalidateMandatoryField,
              },
              {
                ctrl: f("companyInput"),
                fn: utils._LCvalidateMandatoryField,
              },
              // {
              //   ctrl: f("previousJobTitleCombo"),
              //   fn: utils._LCstrictValidationComboBox,
              // },
              {
                ctrl: f("salaryInput"),
                fn: utils._LCvalidateMandatoryField,
              },
              // {
              //   ctrl: f("experienceRange"),
              //   fn: utils._LCvalidateMandatoryField,
              // },
              // {
              //   ctrl: f("rolesInput"),
              //   fn: utils._LCvalidateMandatoryField,
              // },
              // {
              //   ctrl: f("employmentTypeCombo"),
              //   fn: utils._LCstrictValidationComboBox,
              // },
              {
                ctrl: f("expectedSalaryInput"),
                fn: utils._LCvalidateMandatoryField,
              },
              {
                ctrl: f("noticePeriodCombo"),
                fn: utils._LCstrictValidationComboBox,
              },
            );
          } else {
            mandatoryChecks.push(
              {
                ctrl: f("fresherExpertiseInput"),
                fn: utils._LCvalidateMandatoryField,
              }
              // {
              //   ctrl: f("fresherSelfDesc"),
              //   fn: utils._LCvalidateMandatoryField,
              // }
            );
          }

          //  Validate sequentially
          const allFieldsValid = validateInOrder(mandatoryChecks);
          if (!allFieldsValid) return;

          //  Resume Validation via MessageStrip
          const tokenModel = this.getView().getModel("tokenModel");
          const files = tokenModel?.getProperty("/tokens") || [];

          const fileErrorLayout = f("fileErrorLayout");
          const fileErrorText = f("fileErrorText");

          if (!files.length) {
            if (fileErrorLayout && fileErrorText) {
              fileErrorLayout.setVisible(true);
              fileErrorText.setVisible(true);
              fileErrorText.setText(
                i18n.getText("uploadRequired") || "Resume upload is required."
              );
            }
            scrollToError(f("id_tokenizer"));
            return;
          } else {
            if (fileErrorLayout && fileErrorText) {
              fileErrorLayout.setVisible(false);
              fileErrorText.setVisible(false);
            }
          }

          //  If everything is good — proceed
          const oPayload = this.getFormDataAsJSON();

          this.getBusyDialog();

          try {
            await this.ajaxCreateWithJQuery("JobApplications", {
              data: oPayload,
            });
            MessageBox.success("Your Job Application Submitted Successfully!", {
              onClose: () => {
                this.onClose(); // Only close after user clicks OK
              },
            });
          } catch (err) {
            MessageToast.show(err.message || " Submission failed.");
          } finally {
            this.closeBusyDialog();
          }
        },

        _appendComboTextFields: function (jsonData) {
          const f = (id) => sap.ui.core.Fragment.byId("jobFormFrag", id);
          const appendCombo = (id, field) => {
            const combo = f(id);
            if (combo) {
              const selectedText = combo.getSelectedItem()?.getText?.();
              const typedValue = combo.getValue?.();
              jsonData[field] = typedValue || selectedText || "";
            }
          };

          appendCombo("isd_code", "ISD");
          appendCombo("countryCombo", "Country");
          // appendCombo("LocationComboBox", "City");
          if (!jsonData.City) {
            appendCombo("LocationComboBox", "City");
          }

          appendCombo("previousJobTitleCombo", "Designation");
          appendCombo("universityCombo", "University");
          appendCombo("noticePeriodCombo", "NoticePeriod");

          const qualCombo = f("qualificationCombo");
          if (qualCombo) {
            const value =
              qualCombo.getSelectedItem()?.getText?.() ||
              qualCombo.getValue?.();
            jsonData.HighestQualifaction = value || "";
          }
        },

        onOpenReferrerDialog: function () {
          const oView = this.getView();
          const oSelectedCandidateModel = oView.getModel("SelectedCandidate");

          if (!this.pReferrerDialogPromise) {
            this.pReferrerDialogPromise = Fragment.load({
              id: oView.getId(), // ensures scoped IDs
              name: "sap.kt.com.minihrsolution.fragment.ReferrerDetails",
              controller: this,
            }).then((oDialog) => {
              oView.addDependent(oDialog);
              oDialog.setModel(oSelectedCandidateModel, "SelectedCandidate");
              return oDialog;
            });
          }

          this.pReferrerDialogPromise.then((oDialog) => {
            // Set or refresh model
            oDialog.setModel(oSelectedCandidateModel, "SelectedCandidate");

            //  Delay this part slightly so the control is ready after rendering
            setTimeout(() => {
              const oTitle = Fragment.byId(oView.getId(), "positionInput");
              const jobTitle =
                oSelectedCandidateModel?.getProperty("/JobTitle");

              if (oTitle && jobTitle) {
                oTitle.setText(jobTitle);
              } else {
              }
            }, 0); // 0ms ensures it runs after rendering

            oDialog.open();
          });
        },

        onReferredToChange: function (oEvent) {
          const oCombo = oEvent.getSource();
          const sKey = oCombo.getSelectedKey();

          if (!sKey) {
            oCombo.setValueState("Error");
            oCombo.setValueStateText(
              "Please select a valid person from the list."
            );
          } else {
            oCombo.setValueState("None");
          }
        },

        onRemoveFile: function () {
          const fileUploader = sap.ui.core.Fragment.byId(
            "jobFormFrag",
            "FileUploader"
          );

          fileUploader.setValue(""); // Clear the file
          fileUploader.setValueState("Error"); // Set error state after removal
          fileUploader.setValueStateText("Please upload your resume"); // Optional, user-friendly message

          // Remove any previously selected file reference
          this.oSelectedFile = null;

          sap.m.MessageToast.show("File removed. Please upload your resume");
        },

        onSharePress: function (oEvent) {
          const createItem = (iconPath, title, pressHandler) => {
            return new sap.m.CustomListItem({
              type: "Active",
              press: pressHandler,
              content: [
                new sap.m.HBox({
                  alignItems: "Center",
                  justifyContent: "Start",
                  width: "100%",
                  items: [
                    new sap.m.Image({
                      src: iconPath,
                      width: "18px",
                      height: "18px",
                      decorative: false,
                    }).addStyleClass("shareIcon"),
                    new sap.m.Text({
                      text: title,
                    }).addStyleClass("shareText"),
                  ],
                }).addStyleClass("shareItemBox"),
              ],
            });
          };

          const oSource = oEvent.getSource();

          // If Popover already exists and is open, close it
          if (this._oSharePopover && this._oSharePopover.isOpen()) {
            this._oSharePopover.close();
            return;
          }

          if (!this._oSharePopover) {
            const oJobModel = this.getView().getModel("JobApplicationModel");
            const sJobId = oJobModel?.getProperty("/ID") || "";
            const sBaseURL = window.location.origin + window.location.pathname;
            const sHash = "#/JobView/" + encodeURIComponent(sJobId);
            const sFullShareURL = `${sBaseURL}?sap-ui-xx-viewCache=false${sHash}`;
            // const sMessage = ""
            const sMessage = `Explore this exciting opportunity at Kalpavriksha Technologies.\nApply now or share it with someone who might be a great fit\n${sFullShareURL}`;
            // const sMessage = `📢 Kalpavriksha Technologies is hiring!\nExplore this opportunity and apply now:\n${sFullShareURL}`;

            const items = [
              createItem("image/linkedin.png", "LinkedIn", () => {
                this._oSharePopover.close();
                window.open(
                  "https://www.linkedin.com/sharing/share-offsite/?url=" +
                    encodeURIComponent(sFullShareURL),
                  "_blank"
                );
                sap.m.MessageToast.show("Opening LinkedIn...");
              }),

              createItem("image/Mail.png", "Email", () => {
                this._oSharePopover.close();
                const sSubject =
                  "Exciting Job Opportunity at Kalpavriksha Technologies";
                window.location.href =
                  "mailto:?subject=" +
                  encodeURIComponent(sSubject) +
                  "&body=" +
                  encodeURIComponent(sMessage);
              }),

              createItem("image/Whatsapp.png", "WhatsApp", () => {
                this._oSharePopover.close();
                window.open(
                  "https://api.whatsapp.com/send?text=" +
                    encodeURIComponent(sMessage),
                  "_blank"
                );
                sap.m.MessageToast.show("Opening WhatsApp...");
              }),

              createItem("image/Link.png", "Copy Link", () => {
                this._oSharePopover.close();
                navigator.clipboard.writeText(sMessage);
                sap.m.MessageToast.show("Link copied");
              }),
            ];
            // Style the last item differently
            const lastHBox = items[items.length - 1].getContent()[0];
            lastHBox.removeStyleClass("shareItemBox");
            lastHBox.addStyleClass("shareItemBoxLast");

            this._oSharePopover = new sap.m.Popover({
              placement: sap.m.PlacementType.Bottom,
              showHeader: false,
              contentWidth: "150px",
              content: [
                new sap.m.List({
                  items: items,
                }),
              ],
            });
          }

          // Open popover
          this._oSharePopover.openBy(oSource);
        },

        onLinkedInPress: function () {
          window.open("https://linkedin.com", "_blank");
        },

        onEmailPress: function () {
          window.location.href =
            "mailto:?subject=Check this out&body=" +
            encodeURIComponent(window.location.href);
        },

        onWhatsAppPress: function () {
          const url = encodeURIComponent(window.location.href);
          window.open("https://wa.me/?text=" + url, "_blank");
        },

        onCopyLinkPress: function () {
          navigator.clipboard.writeText(window.location.href);
          sap.m.MessageToast.show("Link copied!");
        },
        // copyDynamicLink: function (oEvent) {
        //   var that = this;

        //   // Optional: Get Job ID or Applicant ID if needed
        //   var jobId = "static123"; // replace with dynamic logic if needed

        //   $.ajax({
        //     url: "/api/getDynamicLink?jobId=" + jobId, // Replace with your real API
        //     method: "GET",
        //     success: function (response) {
        //       // Example response: { token: "abc123" }
        //       var token = response.token || "defaultToken";

        //       // Build your app link with hash-based routing
        //       var link =
        //         window.location.origin + "/index.html#/JobView?id=" + token;

        //       navigator.clipboard
        //         .writeText(link)
        //         .then(function () {
        //           sap.m.MessageToast.show("Link copied to clipboard!");
        //         })
        //         .catch(function (err) {
        //           sap.m.MessageBox.error("Failed to copy: " + err);
        //         });
        //     },
        //     error: function () {
        //       sap.m.MessageBox.error(
        //         "Could not fetch dynamic link from backend."
        //       );
        //     },
        //   });
        // },
      }
    );
  }
);
